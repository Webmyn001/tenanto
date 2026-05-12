const rateLimit = require('express-rate-limit');

const ipKeyGen = (req) => req.user?._id?.toString() || req.ip;

// Default options shared across limiters
const base = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGen,
};

const authLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, max: 30 });
const inspectionLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, max: 20 }); // 20 bookings/hr/user
const paymentLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, max: 30 });
const chatLimiter = rateLimit({ ...base, windowMs: 60 * 1000, max: 60 }); // 1/sec average
const uploadLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, max: 60 });
const lookupLimiter = rateLimit({ ...base, windowMs: 60 * 1000, max: 30 });

module.exports = {
  authLimiter,
  inspectionLimiter,
  paymentLimiter,
  chatLimiter,
  uploadLimiter,
  lookupLimiter,
};
