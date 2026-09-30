const { Router } = require('express');
const db = require('../db');
const { isUniqueViolation } = require('../db/errors');
const { normaliseEmail, validateRegistration } = require('../utils/validation');
const { hashPassword, comparePassword, signToken, DUMMY_HASH } = require('../utils/auth');

const router = Router();

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body ?? {};

  const errors = validateRegistration({ email, password, name });
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    [user] = await db('users')
      .insert({
        email: normaliseEmail(email),
        password_hash: passwordHash,
        name: name.trim(),
      })
      .returning(['id', 'email', 'name']);
  } catch (err) {
    // Rely on the database's unique constraint rather than checking first:
    // a "check then insert" would let two simultaneous sign-ups both pass.
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  }

  res.status(201).json({ token: signToken(user.id), user: toPublicUser(user) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await db('users').where({ email: normaliseEmail(email) }).first();

  // Hash against a dummy when the email is unknown, so the response takes
  // the same time either way and can't reveal which emails are registered.
  const passwordMatches = await comparePassword(password, user?.password_hash ?? DUMMY_HASH);

  // Same message for "no such email" and "wrong password", for the same reason.
  if (!user || !passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.status(200).json({ token: signToken(user.id), user: toPublicUser(user) });
});

module.exports = router;
