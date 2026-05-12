function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

function requireApproved(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Auth required' });
  if (req.user.role === 'admin') return next();
  if (!req.user.canTransact) {
    return res.status(403).json({
      error: 'Verification required',
      verificationStatus: req.user.verificationStatus,
    });
  }
  next();
}

module.exports = { requireRole, requireApproved };
