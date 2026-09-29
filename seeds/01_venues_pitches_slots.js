/**
 * Development data: fictional Glasgow venues, their pitches, and hourly
 * slots for the next 14 days. Re-running this wipes venues, pitches, slots
 * and bookings (but not users) and starts fresh.
 */

const { VENUE_TIME_ZONE } = require('../src/utils/time');

const DAYS_AHEAD = 14;

const VENUES = [
  {
    name: 'Kelvin Five-a-Side Centre',
    address: '12 Kelvinhaugh Street, Glasgow G3 8PL',
    opening_time: '09:00',
    closing_time: '22:00',
    pitches: [
      { name: 'Cage 1', surface_type: '3G', price_per_hour: 60 },
      { name: 'Cage 2', surface_type: '3G', price_per_hour: 60 },
      { name: 'Cage 3', surface_type: 'Astroturf', price_per_hour: 50 },
    ],
  },
  {
    name: 'Southside Soccer Dome',
    address: '48 Pollokshaws Road, Glasgow G41 1QW',
    opening_time: '10:00',
    closing_time: '23:00',
    pitches: [
      { name: 'Indoor Pitch A', surface_type: 'Indoor', price_per_hour: 75 },
      { name: 'Indoor Pitch B', surface_type: 'Indoor', price_per_hour: 75 },
    ],
  },
  {
    name: 'Clydeside Sports Park',
    address: '3 Riverside Way, Glasgow G5 8NP',
    opening_time: '08:00',
    closing_time: '21:00',
    pitches: [
      { name: 'North Pitch', surface_type: 'Grass', price_per_hour: 40 },
      { name: 'South Pitch', surface_type: '3G', price_per_hour: 55 },
    ],
  },
];

exports.seed = async function seed(knex) {
  // Children before parents, since bookings reference slots, and so on.
  await knex('bookings').del();
  await knex('slots').del();
  await knex('pitches').del();
  await knex('venues').del();

  for (const { pitches, ...venue } of VENUES) {
    const [{ id: venueId }] = await knex('venues').insert(venue).returning('id');
    await knex('pitches').insert(pitches.map((pitch) => ({ ...pitch, venue_id: venueId })));
  }

  // One slot per pitch, per day, per hour between opening and closing
  // (venues open and close on the hour). Postgres does the date arithmetic:
  // generate_series produces each day and each hour, and AT TIME ZONE turns
  // UK wall-clock times into exact moments, so a 19:00 slot stays at 19:00
  // across the GMT/BST clock changes.
  await knex.raw(
    `
    INSERT INTO slots (pitch_id, start_time, end_time)
    SELECT
      p.id,
      (d.day + h.hour * interval '1 hour') AT TIME ZONE :tz,
      (d.day + (h.hour + 1) * interval '1 hour') AT TIME ZONE :tz
    FROM pitches p
    JOIN venues v ON v.id = p.venue_id
    CROSS JOIN generate_series(
      CAST(CAST(now() AT TIME ZONE :tz AS date) AS timestamp),
      CAST(CAST(now() AT TIME ZONE :tz AS date) AS timestamp) + (:lastDay * interval '1 day'),
      interval '1 day'
    ) AS d(day)
    CROSS JOIN LATERAL generate_series(
      CAST(EXTRACT(HOUR FROM v.opening_time) AS integer),
      CAST(EXTRACT(HOUR FROM v.closing_time) AS integer) - 1
    ) AS h(hour)
    `,
    { tz: VENUE_TIME_ZONE, lastDay: DAYS_AHEAD - 1 }
  );
};
