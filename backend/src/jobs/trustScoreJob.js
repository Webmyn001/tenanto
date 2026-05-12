const User = require('../models/User');
const { recomputeTrustScore } = require('../utils/trustScore');

module.exports = {
  name: 'trustScoreRecompute',
  schedule: '0 3 * * *', // 03:00 daily
  async run() {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600_000);
    const users = await User.find({
      role: { $in: ['student', 'corper', 'landlord'] },
      $or: [{ updatedAt: { $gte: cutoff } }, { createdAt: { $gte: cutoff } }],
    }).select('_id');

    let touched = 0;
    for (const u of users) {
      try { await recomputeTrustScore(u._id); touched++; } catch {}
    }
    return { recomputed: touched, total: users.length };
  },
};
