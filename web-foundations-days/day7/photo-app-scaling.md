# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from the people they follow. This plan estimates the load and designs a system to carry it.

## Assumptions

- 10 million registered users, 10% active each day, so 1 million daily active users (DAU).
- Each active user uploads 1 photo and views 50 feed pages per day.
- A photo is 2 MB on average, and each also gets a 50 KB thumbnail.
- A day has 86,400 seconds, and peak traffic is 5 times the average.
- The feed shows thumbnails. The full photo is fetched only when someone opens it.

## Estimates

| Measure | Working | Result |
|---|---|---|
| Daily active users | 10,000,000 x 10% | 1,000,000 |
| Uploads per second | 1,000,000 / 86,400 | about 12 average, 58 peak |
| Feed views per second | 1,000,000 x 50 / 86,400 | about 579 average, **2,900 peak** |
| Originals per year | 1,000,000 x 2 MB x 365 | 730 TB |
| Thumbnails per year | 1,000,000 x 50 KB x 365 | 18.25 TB |
| **Storage per year** | 730 TB + 18.25 TB | **about 748 TB** |

## Read-heavy or write-heavy?

**Read-heavy.** Every upload is matched by 50 feed views, so reads outnumber writes 50 to 1 (579 a second against 12). The design should make reads cheap: serve photos from a CDN, keep hot feed data in a cache, and send database reads to a replica. Writes are rare enough for one primary database, and the slow part of a write, making the thumbnail, can happen in the background.

## Why photos don't go in the database

A photo is a 2 MB blob, and 730 TB of them a year would make backups slow, replication heavy and storage expensive, for files the database can't search anyway. Photos go in **object storage**, which is cheap and built for large files. The database keeps only metadata: who uploaded the photo, when, and its URL.

## Architecture

```
 Users (phones, web) ------------> +-----+
        |                          | CDN | <---- photos and thumbnails
        |                          +-----+
        |                             | on a miss
        v                             v
 +---------------+            +----------------+
 | Load balancer |            | Object storage |
 +---------------+            +----------------+
   |     |     |                  ^         ^
   v     v     v                  |         |
 +-------+-------+-------+        |         |
 | App 1 | App 2 | App 3 |--------+         |
 +-------+-------+-------+                  |
   |       |        |                       |
   |       |        +--> +-------+      +--------+
   |       |             | Queue | ---> | Worker | makes thumbnails
   |       v             +-------+      +--------+
   |   +-------+
   |   | Cache | feed pages, hot metadata
   |   +-------+
   v
 +------------+  replication  +--------------+
 | Primary DB | ------------> | Read replica |
 +------------+               +--------------+
```

## What each component does

- **CDN:** serves photos from servers near the user, so most image requests never reach us.
- **Load balancer:** spreads requests across the app servers, so none is overloaded and one failure doesn't stop the app.
- **App servers:** run the SnapShare code, and because they keep no state, we add more when traffic grows.
- **Cache:** holds recent feed pages in memory, so repeat reads skip the database.
- **Primary database:** stores the metadata and takes all the writes.
- **Read replica:** a live copy of the primary that answers feed reads, so they don't compete with writes.
- **Object storage:** holds the photo files, which are too big and too many for the database.
- **Queue:** holds thumbnail jobs, so an upload finishes fast and a burst of uploads doesn't swamp the workers.
- **Worker:** takes jobs off the queue and makes the thumbnails in the background.

## Uploading a photo, step by step

1. The app sends the photo through the load balancer to an app server.
2. The app server checks the user is logged in and the file is a valid image of an allowed size, then saves the original to object storage.
3. It writes a row to the primary database: user, time, file URL and status "processing".
4. It puts a "make thumbnail" job on the queue and replies to the user straight away.
5. A worker takes the job and downloads the original.
6. The worker saves a 50 KB thumbnail to object storage and updates the row to "ready".
7. Followers see the photo when their cached feed page next expires (about 30 seconds), with the thumbnail served by the CDN.

## Trade-offs

- **Caching: speed against freshness.** The cache makes the feed fast and protects the database, but a cached page can be 30 seconds old, so a new photo may not appear at once. Nobody needs a feed exact to the second, so we accept it.
- **Read replica: scale against consistency.** The replica copies from the primary with a short delay, so right after uploading, a user might not see their own photo if the read goes to the replica. We read a user's own photos from the primary.
- **Queue and worker: fast uploads against delay.** Uploads stay quick and survive spikes, but the thumbnail appears a few seconds late, so the app shows a placeholder. It also adds two more parts to run and monitor.
