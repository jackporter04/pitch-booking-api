const { Router } = require('express');
const db = require('../db');
const { parseId } = require('../utils/validation');

const router = Router();

const VENUE_COLUMNS = ['id', 'name', 'address', 'opening_time', 'closing_time'];

// Results are wrapped in { data } so pagination details can be added
// alongside them later without changing the shape clients rely on.
router.get('/', async (req, res) => {
  const venues = await db('venues').select(VENUE_COLUMNS).orderBy('name');
  res.json({ data: venues });
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(400).json({ error: 'Venue id must be a positive whole number' });
  }

  const venue = await db('venues').select(VENUE_COLUMNS).where({ id }).first();
  if (!venue) {
    return res.status(404).json({ error: 'Venue not found' });
  }

  const pitches = await db('pitches')
    .select('id', 'name', 'surface_type', 'price_per_hour')
    .where({ venue_id: id })
    .orderBy('name');

  res.json({ data: { ...venue, pitches } });
});

module.exports = router;
