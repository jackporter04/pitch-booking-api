const express = require('express');
const healthRouter = require('./routes/health');

const app = express();

app.use(express.json());

app.use('/health', healthRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Express 5 forwards rejected promises from async handlers here.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
