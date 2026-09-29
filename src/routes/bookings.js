const { Router } = require('express');
const db = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { parseId } = require('../utils/validation');

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const slotId = parseId(req.body?.slot_id);
  if (slotId === null) {
    return res.status(400).json({ error: 'slot_id must be a positive whole number' });
  }

  // Ask the database whether the slot has started, rather than comparing
  // against this server's clock, so there's a single source of "now".
  const slot = await db('slots')
    .where({ id: slotId })
    .first('id', 'start_time', 'end_time', db.raw('start_time <= now() AS has_started'));
  if (!slot) {
    return res.status(404).json({ error: 'Slot not found' });
  }
  if (slot.has_started) {
    return res.status(400).json({ error: 'This slot has already started and can no longer be booked' });
  }

  const [booking] = await db('bookings')
    .insert({ slot_id: slotId, user_id: req.userId })
    .returning(['id', 'slot_id', 'status', 'created_at']);

  res.status(201).json({
    data: { ...booking, start_time: slot.start_time, end_time: slot.end_time },
  });
});

module.exports = router;
