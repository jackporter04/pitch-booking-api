require('dotenv').config({ quiet: true });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '24h',
};

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
}

// A short or placeholder secret makes tokens easy to forge.
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters. See .env.example.');
}

module.exports = config;
