const { verifyToken } = require('../utils/auth');

// Protects a route: expects "Authorization: Bearer <token>", and on success
// sets req.userId for the route handler to use.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.userId = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
}

module.exports = requireAuth;
