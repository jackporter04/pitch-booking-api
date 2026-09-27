const config = require('./config');
const app = require('./app');
const db = require('./db');

const server = app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port} (${config.env})`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.destroy().finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
