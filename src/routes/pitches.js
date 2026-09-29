const { Router } = require('express');
const db = require('../db');
const { parseId, isValidDate } = require('../utils/validation');
const { VENUE_TIME_ZONE } = require('../utils/time');

const router = Router();

router.get('/:id/slots', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Pitch id must be a positive whole number' });
  }

  const { date } = req.query;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'date query parameter is required, in YYYY-MM-DD format' });
  }

  const pitch = await db('pitches').where({ id }).first('id');
  if (!pitch) {
    return res.status(404).json({ error: 'Pitch not found' });
  }

  // "date" means a UK calendar day, so the range runs from UK midnight to
  // the next UK midnight, whatever time zone the server itself is in.
  const slots = await db('slots as s')
    .leftJoin('bookings as b', function joinConfirmed() {
      this.on('b.slot_id', 's.id').andOnVal('b.status', 'confirmed');
    })
    .where('s.pitch_id', id)
    .whereRaw('s.start_time >= (CAST(? AS date) + time \'00:00\') AT TIME ZONE ?', [date, VENUE_TIME_ZONE])
    .whereRaw('s.start_time < (CAST(? AS date) + 1 + time \'00:00\') AT TIME ZONE ?', [date, VENUE_TIME_ZONE])
    .orderBy('s.start_time')
    .select(
      's.id',
      's.start_time',
      's.end_time',
      db.raw('(b.id IS NULL AND s.start_time > now()) AS available')
    );

  res.json({ data: slots });
});

module.exports = router;
