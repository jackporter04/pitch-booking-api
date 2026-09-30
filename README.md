# 5-a-Side Pitch Booking API

A REST API for booking 5-a-side pitches: browse venues, see available time slots, and book a slot without double-booking it.

**Stack:** Node.js, Express 5, PostgreSQL, Knex (migrations and queries).

## Getting started

Requirements: Node.js 20+ and a PostgreSQL database (a local install, or `docker compose up -d` using the included `docker-compose.yml`).

```bash
npm install
cp .env.example .env      # then set DATABASE_URL and JWT_SECRET
npm run migrate           # create the schema
npm run seed              # optional: example venues, pitches and 14 days of slots
npm run dev               # start with auto-reload on http://localhost:3000
```

Check it's up:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up"}
```

`/health` returns `503` if the database is unreachable.

## Endpoints

| Method | Path | Purpose | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Service and database status | No |
| POST | `/auth/register` | Create an account, returns a JWT | No |
| POST | `/auth/login` | Log in, returns a JWT | No |
| GET | `/venues` | List venues | No |
| GET | `/venues/:id` | One venue and its pitches | No |
| GET | `/pitches/:id/slots?date=YYYY-MM-DD` | A pitch's slots for a UK calendar day, with availability | No |
| POST | `/bookings` | Book a slot: `{ "slot_id": 42 }`. `409` if it's already booked | Yes |
| GET | `/bookings/me` | The logged-in user's bookings, including cancelled ones | Yes |
| DELETE | `/bookings/:id` | Cancel a booking. `403` unless you own it | Yes |

Protected routes expect an `Authorization: Bearer <token>` header. Tokens expire after 24 hours.

Times are returned as UTC ISO 8601 strings (e.g. `2026-10-03T18:00:00.000Z`). Prices are returned as strings (e.g. `"60.00"`) to avoid floating-point rounding.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the server |
| `npm run dev` | Start with `node --watch` |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:rollback` | Roll back the last migration batch |
| `npm run migrate:make <name>` | Create a new migration file |
| `npm run seed` | Reset venues, pitches, slots and bookings to example data (users are kept) |

## Data model

| Entity | Key fields | Notes |
| --- | --- | --- |
| User | id, email (unique), password_hash, name, created_at | Passwords are only ever stored hashed |
| Venue | id, name, address, opening_time, closing_time | One venue has many pitches |
| Pitch | id, venue_id, name, surface_type, price_per_hour | Belongs to one venue |
| Slot | id, pitch_id, start_time, end_time | One bookable window on one pitch; unique per (pitch, start_time) |
| Booking | id, slot_id, user_id, status, created_at | `status` is `confirmed` or `cancelled` |

## Preventing double-booking

Two people booking the same slot within milliseconds is a race condition: if the code checked "is this slot free?" and then inserted, both requests could pass the check before either insert landed.

So there is no such check. The guarantee lives in the database as a partial unique index:

```sql
CREATE UNIQUE INDEX bookings_one_confirmed_per_slot
ON bookings (slot_id)
WHERE status = 'confirmed';
```

`POST /bookings` attempts the insert inside a transaction. Postgres accepts the first and refuses any other, and the API translates that unique violation into `409 Conflict` rather than leaking a database error. Because the index only covers *confirmed* rows, cancelling a booking frees its slot to be booked again.

## Design decisions

- **Authentication vs authorisation.** A valid token proves who you are (`401` without one); it doesn't let you act on other people's bookings (`403`). The user is always taken from the token, never from the request body.
- **Cancelling is race-safe too.** The update only applies to a booking that is still confirmed, so two simultaneous cancels give one `200` and one `409`. Bookings can't be cancelled once the slot has started.
- **Opening hours are enforced by construction.** Only slots can be booked, and slots only exist within a venue's opening hours.
- **Pre-generated slots.** A booking claims an existing slot row rather than checking for overlapping time ranges on every write.
- **UK time zone for venues.** Opening hours and `?date=` are UK local time (`Europe/London`); slots are stored as exact moments, so a 19:00 slot stays at 19:00 across the GMT/BST clock change regardless of the server's own time zone.
- **Availability in one query.** Slots are left-joined to *confirmed* bookings, so a cancelled booking frees its slot, and slots that have already started are shown as unavailable.
- **Soft cancellation.** Cancelling sets `status = 'cancelled'` and keeps the row, so booking history is preserved. Foreign keys from bookings are `RESTRICT` so a booked slot or user can't be silently deleted.
- **Passwords hashed with bcrypt** (12 rounds) and never returned by the API. Emails are trimmed and lowercased so `Jack@x.com` and `jack@x.com` are one account.
- **Login doesn't reveal which emails are registered.** Unknown emails and wrong passwords get the same 401 message, and unknown emails are still checked against a dummy hash so both take the same time.
- **Duplicate sign-ups are caught by the database's unique constraint**, not a "check then insert", which two simultaneous requests could both pass.
- **Integrity in the database, not just the app.** Check constraints enforce `start_time < end_time`, `opening_time < closing_time` and non-negative prices; booking status is a Postgres enum.
