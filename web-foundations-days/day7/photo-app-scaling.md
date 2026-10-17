# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from the people they follow. This plan estimates the load and designs a system that can carry it.

## Assumptions

- 10 million registered users.
- 10% of them are active on a given day, so 1 million daily active users (DAU).
- Each active user uploads 1 photo per day and views 50 feed pages per day.
- An average photo is 2 MB. Each photo also gets a 50 KB thumbnail.
- A day has 86,400 seconds.
- Peak traffic is 5 times the average.
- The feed shows thumbnails. The full 2 MB photo is only fetched when someone opens it.

## Estimates

| Measure | Working | Result |
|---|---|---|
| Daily active users | 10,000,000 x 10% | 1,000,000 |
| Uploads per day | 1,000,000 x 1 | 1,000,000 |
| Uploads per second (average) | 1,000,000 / 86,400 | about 12 |
| Uploads per second (peak) | 12 x 5 | about 58 |
| Feed views per day | 1,000,000 x 50 | 50,000,000 |
| Feed views per second (average) | 50,000,000 / 86,400 | about 579 |
| Feed views per second (peak) | 579 x 5 | about 2,900 |
| Original photos per year | 1,000,000 x 2 MB x 365 | 730 TB |
| Thumbnails per year | 1,000,000 x 50 KB x 365 | 18.25 TB |
| **Storage per year** | 730 TB + 18.25 TB | **about 748 TB (0.75 PB)** |

## Read-heavy or write-heavy?

The system is **read-heavy**. For every upload there are 50 feed views, a ratio of 50 reads to 1 write (579 reads per second against 12 writes). So the design should make reads cheap and fast: serve photos from a CDN, keep popular feed data in a cache, and send database reads to a replica. Writes are rare enough that a single primary database can handle them, and the slow part of a write (making the thumbnail) can happen in the background.

## Why photos don't go in the database

A photo is a 2 MB blob, and the database would have to store and replicate 730 TB of them every year. That makes backups slow, replication heavy and storage expensive, and it uses up the database's memory and disk on files it can't search anyway. Databases are good at small, structured rows. So the photo files go into **object storage**, which is cheap, grows without limit and is built for large files. The database keeps only the metadata: who uploaded the photo, when, and the URL of the file in object storage.

## Architecture

```
                         +-------------------+
 Users (phones, web) --->|        CDN        |  photos and thumbnails served from the edge
        |                +-------------------+
        |                          | on a miss
        | API requests             v
        |                +-------------------+
        |                |  Object storage   |  originals (2 MB) and thumbnails (50 KB)
        |                +-------------------+
        v                     ^           ^
 +---------------+            | (2)       | (6)
 | Load balancer |            |           |
 +---------------+            |           |
    |      |      |           |           |
    v      v      v           |           |
 +-------+-------+-------+    |           |
 | App   | App   | App   |----+           |
 | srv 1 | srv 2 | srv 3 |                |
 +-------+-------+-------+                |
    |        |        |                   |
    |        |        | (4) job      +-----------+    +--------+
    |        |        +------------> |   Queue   |--->| Worker |
    |        |                       +-----------+    +--------+
    |        v                                         (5) makes the thumbnail
    |   +---------+
    |   |  Cache  |  feed pages and hot photo metadata
    |   +---------+
    v
 +--------------+   replication   +--------------+
 | Primary DB   | --------------> | Read replica |  feed reads
 | (writes)     |                 |              |
 +--------------+                 +--------------+
```

The numbers (2), (4), (5) and (6) match the upload flow below.

## What each component does

- **CDN:** serves photos and thumbnails from servers near the user, so most image requests never reach our servers and load fast everywhere.
- **Load balancer:** spreads incoming requests across the app servers, so no single server is overloaded and one failure doesn't take the app down.
- **App servers:** run the SnapShare code (log in, upload, build the feed), and because they keep no state, we can add more when traffic grows.
- **Cache:** keeps recent feed pages and popular data in memory, so repeated reads skip the database.
- **Primary database:** stores the metadata (users, follows, photo records) and takes all the writes.
- **Read replica:** holds a live copy of the primary and answers feed reads, so the 579 reads per second don't compete with writes.
- **Object storage:** holds the photo files, which are too big and too many for the database.
- **Queue:** holds thumbnail jobs, so an upload can finish fast and a burst of uploads doesn't overwhelm the workers.
- **Worker:** picks jobs off the queue and creates the thumbnails in the background.

## Uploading a photo, step by step

1. The user's app sends the photo to the API. The request goes through the load balancer to one of the app servers.
2. The app server checks the user is logged in and the file is a valid image of an allowed size, then saves the original to object storage.
3. The app server writes a row to the primary database: the user, the time, the file's URL and a status of "processing".
4. The app server puts a "make thumbnail" job on the queue and replies to the user straight away, without waiting for the thumbnail.
5. A worker takes the job from the queue and downloads the original from object storage.
6. The worker makes the 50 KB thumbnail, saves it to object storage, and updates the database row with the thumbnail URL and a status of "ready".
7. The followers' feeds show the new photo the next time their cached feed page expires and reloads (a short time, for example 30 seconds). The thumbnail is served by the CDN.

## Trade-offs

- **Caching: speed against freshness.** The cache makes the feed fast and takes load off the database, but a cached feed page can be up to 30 seconds old, so a new photo may not show immediately. We accept this because nobody needs a feed that is exact to the second.
- **Read replica: scale against consistency.** The replica takes the read load, but it copies from the primary with a small delay (replication lag). Right after uploading, a user might not see their own photo if the read goes to the replica. We handle it by reading a user's own photos from the primary.
- **Queue and worker: fast uploads against delay.** Making thumbnails in the background keeps uploads quick and survives spikes, but the thumbnail appears a few seconds late, so the app shows a placeholder meanwhile. It also adds two more parts to run and monitor.
