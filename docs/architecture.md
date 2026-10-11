# QuickNotes Architecture

This document describes how QuickNotes would run for 1 million users.

## Requirements

**Functional requirements**

- Users can register and log in.
- Users can create, read, update and delete their own notes.
- Users can give notes a category and tags.
- Users can search and filter their notes.
- Notes are available from any device.

**Non-functional requirements**

- **Availability:** about 99.9%, so the app is down for under 9 hours a year.
- **Latency:** `GET /notes` responds in under 200 ms for most requests.
- **Security:** HTTPS everywhere, hashed passwords, and users can only see their own notes.
- **Scalability:** handle growth by adding servers, not by rewriting the system.
- **Durability:** notes are never lost, thanks to replication and backups.

## Load estimate

Assumptions:

- 1,000,000 registered users, 20% active per day = **200,000 daily active users**.
- Each active user creates 5 notes and loads their notes 20 times per day.
- An average note is 500 bytes.
- One day is rounded to 100,000 seconds, and peak traffic is 5 times the average.

| Measure           | Calculation                                        | Average          | Peak    |
| ----------------- | -------------------------------------------------- | ---------------- | ------- |
| Writes per second | 200,000 x 5 = 1,000,000 per day / 100,000          | **10**           | **50**  |
| Reads per second  | 200,000 x 20 = 4,000,000 per day / 100,000         | **40**           | **200** |
| Storage per year  | 1,000,000 notes x 500 bytes = 500 MB per day x 365 | **about 180 GB** |         |

QuickNotes is **read-heavy** (4 reads for every write). Caching will help a lot, and a few ordinary servers can handle 200 requests per second, so the design does not need to be enormous.

## Architecture diagram

```text
                         ┌─────────┐
          ┌─────────────>│   DNS   │  (quicknotes.com -> IP addresses)
          │              └─────────┘
 ┌────────┴──────┐  static files  ┌──────────────────────┐
 │ Browser /     │ ─────────────> │ CDN (HTML, CSS, JS)  │
 │ mobile client │                └──────────────────────┘
 └────────┬──────┘
          │ API calls (HTTPS, JSON)
          v
   ┌───────────────┐
   │ Load balancer │
   └──────┬────────┘
     ┌────┴─────┬──────────┐
     v          v          v
 ┌───────┐  ┌───────┐  ┌───────┐        ┌───────────────┐
 │ App 1 │  │ App 2 │  │ App 3 │ ─────> │ Cache (Redis) │
 └───┬───┘  └───┬───┘  └───┬───┘        └───────────────┘
     │ writes   │ reads    │ jobs
     v          v          v
 ┌─────────┐ ┌──────────┐ ┌───────┐   ┌────────┐
 │ Primary │>│ Read     │ │ Queue │──>│ Worker │ (emails, exports)
 │   DB    │ │ replica  │ └───────┘   └────────┘
 └─────────┘ └──────────┘
```

## What each component does

- **Client:** shows the notes and sends API requests, so users never touch the database.
- **DNS:** turns quicknotes.com into the IP addresses of the CDN and load balancer.
- **CDN:** serves the HTML, CSS and JavaScript from a server near the user, which cuts latency and load on our servers.
- **Load balancer:** spreads requests across the app servers and stops sending traffic to any that fail a health check.
- **App servers (two or more):** run the API code and are stateless, so we can add more when traffic grows.
- **Cache (Redis):** keeps each user's note list in memory so most reads never reach the database.
- **Primary database:** holds the one true copy of the data and is the only place that accepts writes.
- **Read replica:** copies the primary and answers read queries, so reads do not slow down writes.
- **Queue:** holds slow jobs so the app server can reply to the user immediately.
- **Worker:** takes jobs from the queue and does them in the background, such as sending emails or creating exports.

## Request flows

### GET /notes

1. The client sends the request with its token to the load balancer.
2. The load balancer forwards it to a healthy app server.
3. The app server checks the token and finds the user.
4. It looks for `notes:user:1` in the cache.
5. **Cache hit:** it returns the notes at once with `200 OK`.
6. **Cache miss:** it queries a read replica, saves the result in the cache with a TTL, and returns `200 OK`.

### POST /notes

1. The client sends the new note with its token to the load balancer.
2. The load balancer forwards it to a healthy app server.
3. The app server checks the token and validates the data (1 to 200 characters, valid category).
4. It writes the note to the primary database.
5. It deletes the user's cached note list, so stale data is never served.
6. It optionally adds a job to the queue, such as a backup or export.
7. It replies `201 Created`. The primary copies the new row to the replica a few milliseconds later.

## Trade-offs

- **Speed versus freshness:** the cache and read replica make reads fast, but a user could briefly see slightly old data because of cache expiry and replication lag. For notes, a delay of a second is acceptable, and deleting the cache on every write keeps the delay short.
- **Simplicity versus scalability:** one server would be simpler to build and run, but it could not survive a crash or peak traffic. We accept more complexity (cache, replica, queue) in exchange for growth and reliability.
- **Cost versus reliability:** extra app servers and a replica cost more, but they remove single points of failure.

## Avoiding single points of failure

- **App servers:** there are at least two, and they are stateless. If one crashes, the load balancer's health check stops sending traffic to it, and clients retry on a healthy server.
- **Load balancer:** run more than one (cloud load balancers do this automatically).
- **Database:** if the primary fails, a read replica is promoted to become the new primary (failover). Regular backups protect against data loss.
- **Cache:** if Redis goes down, app servers fall back to the database, so the app slows down but keeps working.
- **Static files:** the CDN has many edge servers, so no single one is critical.
