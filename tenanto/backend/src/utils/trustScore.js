const Review = require('../models/Review');
const User = require('../models/User');

const BADGE_RULES = [
  { id: 'trusted_member', minScore: 70 },
  { id: 'highly_rated', minScore: 85 },
  { id: 'top_rated', minScore: 95 },
];

/**
 * Trust score formula (out of 100):
 *   - 50 base for being verified
 *   - up to +30 from review average (5 stars × 6)
 *   - up to +20 for tenure (1 month → 5pts, 6 months → 20pts)
 *   - up to -30 from bypass warnings (each -5)
 *   - up to -20 from rejection / suspension
 *
 * Side effect: auto-grants/revokes score-tier badges.
 */
async function recomputeTrustScore(userId) {
  const user = await User.findById(userId);
  if (!user) return null;

  let score = 0;
  if (user.verificationStatus === 'approved') score += 50;
  else if (user.verificationStatus === 'submitted') score += 30;

  const reviews = await Review.find({ subject: userId }).select('rating');
  if (reviews.length) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    score += avg * 6;
  }

  const ageMonths = (Date.now() - user.createdAt.getTime()) / (1000 * 86400 * 30);
  score += Math.min(ageMonths, 6) / 6 * 20;

  score -= Math.min(user.bypassWarnings || 0, 6) * 5;
  if (user.suspended) score -= 50;
  if (user.verificationStatus === 'rejected') score -= 20;

  user.trustScore = Math.max(0, Math.min(100, Math.round(score)));

  // Badge auto-grant — append earned badges, drop revoked ones (only the score-tier ones)
  const badges = new Set(user.badges || []);
  for (const r of BADGE_RULES) {
    if (user.trustScore >= r.minScore) badges.add(r.id);
    else badges.delete(r.id);
  }
  user.badges = [...badges];

  await user.save();
  return user.trustScore;
}

module.exports = { recomputeTrustScore };
