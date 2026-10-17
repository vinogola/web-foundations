# TicketHub Design

TicketHub sells tickets for concerts and events. Normal days are quiet, but a popular concert goes on sale like a stampede, so the design is built around that moment.

## 1. Requirements

**Functional:** browse events, view an event's seats, hold seats while paying, pay and receive tickets, see my tickets.

**Non-functional:** correctness first (a seat is never sold twice); fairness (first come, first served); speed (pages under 1 s, a seat hold under 300 ms, even in the rush); 99.9% availability; abandoned seats return to sale.

## 2. Estimates

Assumptions: each buyer makes about 5 requests (event page, seat map, hold, pay, confirmation), the normal-day peak is 5 times the average, and the first minute of a sale is about 3 times the sale average.

| | Normal day | Big sale (600 s) |
|---|---|---|
| Requests per second | 500,000 / 86,400 = about 6 (29 at peak) | 200,000 x 5 / 600 = about 1,670 (5,000 in the first minute) |
| Tickets sold per second | 5,000 / 86,400 = about 0.06 | up to 20,000 / 600 = about 33 |

Compared with a normal day, the sale has about 290 times the requests (58 times the normal peak) and about 580 times the sales. Ten people want every seat, so most attempts must fail politely. The design has to protect the seat writes, not just serve pages.

## 3. API

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | `/events` | Browse events | 200 |
| GET | `/events/{id}/seats` | Seat map and availability | 200 |
| POST | `/events/{id}/holds` | Hold chosen seats for 5 minutes | 201 (409 if taken) |
| POST | `/orders` | Pay for a hold: `{ holdId, paymentToken }` | 201 (410 hold expired, 402 payment failed) |
| GET | `/me/tickets` | View my tickets | 200 |
| DELETE | `/holds/{id}` | Release a hold | 204 |

## 4. Data model

- **users** (id PK, name, email UNIQUE)
- **events** (id PK, name, venue, starts_at, sale_opens_at)
- **seats** (id PK, event_id FK, label, price_cents, status CHECK available/held/sold, held_by FK users, held_until; UNIQUE event_id + label)
- **orders** (id PK, user_id FK, event_id FK, total_cents, status, created_at)
- **order_items** (order_id FK, seat_id FK **UNIQUE**)

One user has many orders, one event has many seats and many orders, and one order has many items. Each seat can appear in at most one order item.

## 5. Preventing double-booking

Three layers (tested in SQLite: 50 simultaneous attempts on one seat gave exactly 1 winner):

1. **Atomic hold.** One statement checks and claims the seat, so two buyers can't both pass the check. One row changed means you hold it. Zero rows means 409.

```sql
UPDATE seats SET status='held', held_by=?, held_until=?
WHERE id=? AND (status='available' OR (status='held' AND held_until < ?));
```

2. **Transactional payment.** In one transaction, mark the seat `sold` only if it is held by this user and the hold hasn't expired, then insert the order and its items. If any step fails, ROLLBACK.
3. **Constraint backstop.** `order_items.seat_id` is UNIQUE, so even a bug in the code can't sell a seat twice. The database refuses.

A worker releases expired holds every minute.

## 6. Architecture

```
 Users --> CDN (event pages, images)
   |
   v
 Waiting room (queue)
   |
   v
 Load balancer --> App servers (several)
                     |     |      |
                     v     v      v
                 Cache  Primary  Queue --> Worker
                          DB
                          |
                     Read replica     Payment provider (external)
```

- **CDN:** serves event pages and images near the user, so most of the rush never reaches us.
- **Waiting room:** admits buyers in batches (say 500 a second) in the order they arrived, so the seat database never sees all 200,000 at once and the sale stays fair.
- **Load balancer:** spreads requests over the app servers and skips any that has failed.
- **App servers:** run the API and keep no state, so we add more before a big sale.
- **Cache:** holds event details and seat counts for a second or two, so seat maps don't hit the database every time.
- **Primary database:** the only place seats are held and sold, so there is one source of truth.
- **Read replica:** answers browsing queries so they don't compete with seat writes.
- **Queue and worker:** send tickets and emails and release expired holds, so requests don't wait.
- **Payment provider:** external, and only called after a seat is successfully held.

To survive the sale, the CDN and cache absorb the reads, the waiting room caps the writes, extra servers are added beforehand, and the hold and constraints keep every seat correct.

## 7. Trade-offs

- **Cached seat map: speed against freshness.** A seat may look free for a second or two. The click then fails with 409 and the map refreshes. We accept this to protect the database.
- **Waiting room: protection against friction.** Buyers wait their turn, but without it the site would crash and everyone would lose.
- **Seat holds: fairness against locked seats.** A buyer isn't bumped mid-payment, but their seats are unavailable to others for up to 5 minutes.
- **One primary database: correctness against write scale.** One primary copes with 33 sales a second. If many events sold out at once, we would split the data by event.
