const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');

// Strip sensitive fields before persisting payload
const REDACT_KEYS = new Set(['password', 'nin', 'ssn', 'token', 'apiKey', 'secret', 'authorization', 'cardNumber', 'cvv', 'pin']);
function sanitise(obj, depth = 0) {
  if (depth > 4 || obj == null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => sanitise(v, depth + 1));
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? '[redacted]' : sanitise(v, depth + 1);
    }
    return out;
  }
  return obj;
}

/**
 * Record an audit event. Does not throw — audit failure should never break a request.
 *
 *   audit(req, 'admin.verification.approve', { kind: 'User', id: userId }, { decision: 'approve' });
 */
function audit(req, action, target, payload, outcome = 'success', errorMessage) {
  const entry = {
    actor: req?.user?._id,
    actorRole: req?.user?.role,
    action,
    target,
    payload: sanitise(payload),
    ip: req?.ip || req?.headers?.['x-forwarded-for'],
    userAgent: req?.headers?.['user-agent'],
    outcome,
    errorMessage,
  };
  AuditLog.create(entry).catch((e) => logger.warn({ err: e.message }, '[audit] persist failed'));
}

async function listForActor(actorId, limit = 100) {
  return AuditLog.find({ actor: actorId }).sort({ createdAt: -1 }).limit(limit);
}

async function listForTarget(target, limit = 100) {
  return AuditLog.find({ 'target.id': target.id, 'target.kind': target.kind })
    .populate('actor', 'fullName role')
    .sort({ createdAt: -1 })
    .limit(limit);
}

module.exports = { audit, listForActor, listForTarget };
