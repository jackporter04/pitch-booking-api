# 5-a-Side Pitch Booking API

A REST API for booking 5-a-side pitches: browse venues, see available time slots, and book a slot without double-booking it.

**Stack:** Node.js, Express 5, PostgreSQL, Knex (migrations and queries).

## Getting started

Requirements: Node.js 20+ and a PostgreSQL database (a local install, or `docker compose up -d` using the included `docker-compose.yml`).

```bash
npm install
cp .env.example .env      # then set DATABASE_URL and JWT_SECRET
npm run migrate           # create the schema
npm run dev               # start with auto-reload on http://localhost:3000
```

Check it's up:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"up"}
```

`/health` returns `503` if the database is unreachable.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the server |
| `npm run dev` | Start with `node --watch` |
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:rollback` | Roll back the last migration batch |
| `npm run migrate:make <name>` | Create a new migration file |

## Data model

| Entity | Key fields | Notes |
| --- | --- | --- |
| User | id, email (unique), password_hash, name, created_at | Passwords are only ever stored hashed |
| Venue | id, name, address, opening_time, closing_time | One venue has many pitches |
| Pitch | id, venue_id, name, surface_type, price_per_hour | Belongs to one venue |
| Slot | id, pitch_id, start_time, end_time | One bookable window on one pitch; unique per (pitch, start_time) |
| Booking | id, slot_id, user_id, status, created_at | `status` is `confirmed` or `cancelled` |

Design decisions:

- **Pre-generated slots.** A booking claims an existing slot row rather than checking for overlapping time ranges on every write.
- **Soft cancellation.** Cancelling sets `status = 'cancelled'` and keeps the row, so booking history is preserved. Foreign keys from bookings are `RESTRICT` so a booked slot or user can't be silently deleted.
- **Integrity in the database, not just the app.** Check constraints enforce `start_time < end_time`, `opening_time < closing_time` and non-negative prices; booking status is a Postgres enum.
