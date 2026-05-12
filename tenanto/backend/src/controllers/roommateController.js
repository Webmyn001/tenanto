const RoommateProfile = require('../models/RoommateProfile');
const User = require('../models/User');
const { Conversation, Message } = require('../models/Message');

async function upsertProfile(req, res) {
  const data = { ...req.body, user: req.user._id };

  // Auto-fill school/state from user record
  if (req.user.role === 'student' && !data.school) data.school = req.user.student?.schoolName;
  if (req.user.role === 'corper' && !data.state) data.state = req.user.corper?.stateOfService;

  if (!data.budgetMin || !data.budgetMax) {
    return res.status(400).json({ error: 'budgetMin and budgetMax are required' });
  }

  const profile = await RoommateProfile.findOneAndUpdate(
    { user: req.user._id }, data, { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ profile });
}

async function getMyProfile(req, res) {
  const profile = await RoommateProfile.findOne({ user: req.user._id });
  res.json({ profile });
}

/**
 * Match score (0-100) between two profiles. Higher = better fit.
 * Components:
 *   - school/state match: 30
 *   - department match: 10 (loose)
 *   - budget overlap: up to 25
 *   - lifestyle compatibility: up to 25
 *   - gender preference: 10 (or 0 if hard mismatch)
 */
function computeMatchScore(a, b) {
  let score = 0;
  const reasons = [];

  if (a.school && b.school && a.school === b.school) { score += 30; reasons.push('Same school'); }
  else if (a.state && b.state && a.state === b.state) { score += 20; reasons.push('Same state'); }

  if (a.department && b.department && a.department === b.department) { score += 10; reasons.push('Same department'); }

  // Budget overlap: full overlap = 25; no overlap = 0
  const lo = Math.max(a.budgetMin, b.budgetMin);
  const hi = Math.min(a.budgetMax, b.budgetMax);
  if (hi >= lo) {
    const overlap = hi - lo;
    const totalRange = Math.max(a.budgetMax - a.budgetMin, b.budgetMax - b.budgetMin) || 1;
    score += Math.min(25, (overlap / totalRange) * 25);
    reasons.push(`Budget overlap ₦${lo.toLocaleString()}–₦${hi.toLocaleString()}`);
  }

  // Lifestyle: 5 pts each if matching, 0 if mismatched
  const lifestyle = ['sleepSchedule', 'cleanliness', 'socialLevel'];
  for (const f of lifestyle) {
    if (a[f] === b[f] || a[f] === 'flexible' || b[f] === 'flexible' || a[f] === 'balanced' || b[f] === 'balanced') {
      score += 5;
    }
  }
  if (a.smoker === b.smoker) score += 10;

  // Gender — if either side specifies a preference and the other doesn't match, penalise hard
  if (a.gender !== 'any' && b.gender !== 'any' && a.gender !== b.gender) {
    score -= 30; // hard incompat
    reasons.push('⚠ gender preference mismatch');
  } else if (a.gender === 'any' || b.gender === 'any' || a.gender === b.gender) {
    score += 10;
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

async function getMatches(req, res) {
  const me = await RoommateProfile.findOne({ user: req.user._id });
  if (!me) return res.status(404).json({ error: 'Create your profile first' });

  // Pull plausible candidates first — same school OR same state
  const cand = await RoommateProfile.find({
    user: { $ne: req.user._id },
    active: true,
    $or: [
      me.school ? { school: me.school } : null,
      me.state ? { state: me.state } : null,
    ].filter(Boolean),
  }).populate('user', 'fullName trustScore badges role student corper verificationStatus').limit(100);

  // Only show verified users
  const verified = cand.filter((p) => p.user?.verificationStatus === 'approved');

  const scored = verified.map((p) => ({
    profile: p,
    ...computeMatchScore(me, p),
  }));
  scored.sort((a, b) => b.score - a.score);

  res.json({ matches: scored.slice(0, 25) });
}

async function inviteRoommate(req, res) {
  const { userId, message } = req.body;
  const target = await User.findById(userId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // Open a conversation if one doesn't exist (no property attached)
  const participants = [req.user._id, target._id].sort();
  let convo = await Conversation.findOne({
    participants: { $all: participants, $size: 2 }, property: { $exists: false },
  });
  if (!convo) convo = await Conversation.create({ participants });

  await Message.create({
    conversation: convo._id,
    sender: req.user._id,
    body: `🏠 Roommate invite: ${message || 'Want to be roommates? Let\'s find a place together.'}`,
    flagged: false, blocked: false,
  });
  convo.lastMessageAt = new Date();
  await convo.save();

  res.json({ ok: true, conversationId: convo._id });
}

module.exports = { upsertProfile, getMyProfile, getMatches, inviteRoommate };
