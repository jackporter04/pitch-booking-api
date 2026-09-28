const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Each extra round doubles the hashing time. 12 takes a few hundred ms:
// unnoticeable for one login, but very slow for someone guessing millions.
const BCRYPT_ROUNDS = 12;

// A genuine hash of a random value, compared against during login when no
// user matches, so unknown emails take as long to reject as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// The token's "sub" (subject) claim holds the user's id.
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

// Returns the user id, or throws if the token is forged, malformed or expired.
function verifyToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  return Number(payload.sub);
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  DUMMY_HASH,
};
