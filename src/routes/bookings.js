const { Router } = require('express');
const db = require('../db');
const { isUniqueViolation } = require('../db/errors');
const requireAuth = require('../middleware/requireAuth');
const { parseId } = require('../utils/validation');

const router = Router();

// The partial unique index that allows one confirmed booking per slot.
const ONE_CONFIRMED_PER_SLOT = 'bookings_one_confirmed_per_slot';

router.post('/', requireAuth, async (req, res) => {
  const slotId = parseId(req.body?.slot_id);
  if (slotId === null) {
    return res.status(400).json({ error: 'slot_id must be a positive whole number' });
  }

  let result;
  try {
    // Look up the slot and insert the booking as one unit: if anything
    // fails part-way, the transaction rolls back and nothing is saved.
    result = await db.transaction(async (trx) => {
      // Ask the database whether the slot has started, rather than comparing
      // against this server's clock, so there's a single source of "now".
      const slot = await trx('slots')
        .where({ id: slotId })
        .first('id', 'start_time', 'end_time', trx.raw('start_time <= now() AS has_started'));
      if (!slot) {
        return { status: 404, body: { error: 'Slot not found' } };
      }
      if (slot.has_started) {
        return { status: 400, body: { error: 'This slot has already started and can no longer be booked' } };
      }

      // No "is it already booked?" check here on purpose. Two simultaneous
      // requests could both pass such a check, so the unique index decides:
      // the database accepts the first insert and refuses the second.
      const [booking] = await trx('bookings')
        .insert({ slot_id: slotId, user_id: req.userId })
        .returning(['id', 'slot_id', 'status', 'created_at']);

      return {
        status: 201,
        body: { data: { ...booking, start_time: slot.start_time, end_time: slot.end_time } },
      };
    });
  } catch (err) {
    if (isUniqueViolation(err, ONE_CONFIRMED_PER_SLOT)) {
      return res.status(409).json({ error: 'This slot has already been booked' });
    }
    throw err;
  }

  res.status(result.status).json(result.body);
});

// Every booking the logged-in user has made, including cancelled ones.
router.get('/me', requireAuth, async (req, res) => {
  const rows = await db('bookings as b')
    .join('slots as s', 's.id', 'b.slot_id')
    .join('pitches as p', 'p.id', 's.pitch_id')
    .join('venues as v', 'v.id', 'p.venue_id')
    .where('b.user_id', req.userId)
    .orderBy([
      { column: 's.start_time', order: 'desc' },
      { column: 'b.id', order: 'desc' },
    ])
    .select(
      'b.id',
      'b.status',
      'b.created_at',
      's.id as slot_id',
      's.start_time',
      's.end_time',
      'p.id as pitch_id',
      'p.name as pitch_name',
      'v.id as venue_id',
      'v.name as venue_name'
    );

  res.json({
    data: rows.map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      slot: { id: row.slot_id, start_time: row.start_time, end_time: row.end_time },
      pitch: { id: row.pitch_id, name: row.pitch_name },
      venue: { id: row.venue_id, name: row.venue_name },
    })),
  });
});

// Cancels a booking. Soft delete: the row is kept with status 'cancelled'.
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Booking id must be a positive whole number' });
  }

  const booking = await db('bookings as b')
    .join('slots as s', 's.id', 'b.slot_id')
    .where('b.id', id)
    .first('b.user_id', 'b.status', db.raw('s.start_time <= now() AS has_started'));
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // Being logged in isn't enough: only the booking's owner may cancel it.
  if (booking.user_id !== req.userId) {
    return res.status(403).json({ error: 'You can only cancel your own bookings' });
  }
  if (booking.status === 'cancelled') {
    return res.status(409).json({ error: 'This booking is already cancelled' });
  }
  if (booking.has_started) {
    return res.status(400).json({ error: 'This slot has already started, so the booking can no longer be cancelled' });
  }

  // Only flips a booking that is still confirmed, so if two cancel requests
  // race, the second updates nothing instead of "cancelling" twice.
  const [cancelled] = await db('bookings')
    .where({ id, status: 'confirmed' })
    .update({ status: 'cancelled' })
    .returning(['id', 'slot_id', 'status', 'created_at']);
  if (!cancelled) {
    return res.status(409).json({ error: 'This booking is already cancelled' });
  }

  res.json({ data: cancelled });
});

module.exports = router;
