const { Router } = require('express');
const db = require('../db');

const router = Router();

// 200 when the process and the database are both reachable, 503 otherwise.
router.get('/', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

module.exports = router;
