const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const venuesRouter = require('./routes/venues');
const pitchesRouter = require('./routes/pitches');
const bookingsRouter = require('./routes/bookings');

const app = express();

app.use(express.json());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/venues', venuesRouter);
app.use('/pitches', pitchesRouter);
app.use('/bookings', bookingsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 forwards rejected promises from async handlers here.
app.use((err, req, res, next) => {
  // Client mistakes flagged by Express itself, e.g. malformed JSON in the body.
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'Invalid request body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
