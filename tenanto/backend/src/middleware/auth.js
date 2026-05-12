const { verify } = require('../utils/jwt');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = verify(token);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    if (user.suspended) return res.status(403).json({ error: 'Account suspended', reason: user.suspensionReason });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Variant that decodes if a token exists but doesn't fail when missing
async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const payload = verify(token);
    const user = await User.findById(payload.id);
    if (user && !user.suspended) req.user = user;
  } catch (_) {}
  next();
}

module.exports = { requireAuth, optionalAuth };
