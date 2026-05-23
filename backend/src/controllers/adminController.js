const User = require('../models/User');
const Property = require('../models/Property');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const { Conversation } = require('../models/Message');
const { audit, listForActor, listForTarget } = require('../utils/audit');
const jobs = require('../jobs');

async function pendingVerifications(req, res) {
  const items = await User.find({ verificationStatus: 'submitted' })
    .select('-password')
    .sort({ updatedAt: 1 });
  res.json({ items });
}

async function decideVerification(req, res) {
  const { decision, notes } = req.body; // 'approve' | 'reject'
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  if (decision === 'approve') {
    user.verificationStatus = 'approved';
    if (user.role === 'landlord') {
      user.landlord.adminApproved = true;
      user.badges = [...new Set([...(user.badges || []), 'verified_landlord'])];
    }
    if (user.role === 'student') {
      user.badges = [...new Set([...(user.badges || []), 'student_friendly'])];
    }
    if (user.role === 'corper') {
      user.badges = [...new Set([...(user.badges || []), 'nysc_approved'])];
    }
  } else {
    user.verificationStatus = 'rejected';
    user.verificationNotes = notes || '';
  }
  await user.save();
  audit(req, `admin.verification.${decision}`, { kind: 'User', id: user._id }, { decision, notes });
  res.json({ user });
}

async function pendingListings(req, res) {
  const items = await Property.find({ status: 'pending_review' })
    .populate('landlord', 'fullName trustScore badges')
    .sort({ updatedAt: 1 });
  res.json({ items });
}

async function decideListing(req, res) {
  const { decision, reason } = req.body;
  const property = await Property.findById(req.params.id).select('+fullAddress');
  if (!property) return res.status(404).json({ error: 'Not found' });
  property.status = decision === 'approve' ? 'active' : 'rejected';
  if (decision !== 'approve') property.rejectionReason = reason || '';
  await property.save();
  audit(req, `admin.listing.${decision}`, { kind: 'Property', id: property._id }, { decision, reason });
  res.json({ property });
}

async function disputes(req, res) {
  const items = await Payment.find({ escrowStatus: 'disputed' })
    .populate('property', 'title area')
    .populate('tenant', 'fullName email')
    .populate('landlord', 'fullName email')
    .sort({ updatedAt: -1 });
  res.json({ items });
}

async function resolveDispute(req, res) {
  const { resolution } = req.body; // 'release' | 'refund'
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  if (payment.escrowStatus !== 'disputed') return res.status(400).json({ error: 'Not in dispute' });

  if (resolution === 'release') {
    payment.escrowStatus = 'released';
    payment.releasedAt = new Date();
  } else if (resolution === 'refund') {
    payment.escrowStatus = 'refunded';
    payment.refundedAt = new Date();
  } else {
    return res.status(400).json({ error: "resolution must be 'release' or 'refund'" });
  }
  await payment.save();
  audit(req, `admin.dispute.${resolution}`, { kind: 'Payment', id: payment._id }, { resolution });
  res.json({ payment });
}

async function fraudFeed(req, res) {
  // Conversations with the most blocked attempts surface first
  const items = await Conversation.find({ bypassAttempts: { $gt: 0 } })
    .populate('participants', 'fullName role bypassWarnings')
    .populate('property', 'title')
    .sort({ bypassAttempts: -1 })
    .limit(50);
  res.json({ items });
}

async function suspendUser(req, res) {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  user.suspended = true;
  user.suspensionReason = req.body.reason || 'Admin action';
  await user.save();
  audit(req, 'admin.user.suspend', { kind: 'User', id: user._id }, { reason: user.suspensionReason });
  res.json({ user });
}

async function listUsers(req, res) {
  const { role, verificationStatus, suspended, search, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (suspended !== undefined) filter.suspended = suspended === 'true';
  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit), 100);
  const [items, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Math.min(Number(limit), 100)),
    User.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Math.min(Number(limit), 100)) });
}

async function listAllProperties(req, res) {
  const { status, search, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };
  const skip = (Math.max(1, Number(page)) - 1) * Math.min(Number(limit), 100);
  const [items, total] = await Promise.all([
    Property.find(filter)
      .populate('landlord', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(Number(limit), 100)),
    Property.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Math.min(Number(limit), 100)) });
}

async function analytics(_req, res) {
  const [users, listings, activeListings, payments, escrowed] = await Promise.all([
    User.countDocuments(),
    Property.countDocuments(),
    Property.countDocuments({ status: 'active' }),
    Payment.countDocuments(),
    Payment.aggregate([
      { $match: { escrowStatus: { $in: ['fully_funded', 'partially_funded'] } } },
      { $group: { _id: null, total: { $sum: '$totalDue' } } },
    ]),
  ]);
  res.json({
    users,
    listings,
    activeListings,
    payments,
    escrowedNaira: escrowed[0]?.total || 0,
  });
}

async function auditFeed(req, res) {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.outcome) filter.outcome = req.query.outcome;
  const items = await AuditLog.find(filter)
    .populate('actor', 'fullName role')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({ items });
}

async function auditForActor(req, res) {
  const items = await listForActor(req.params.userId);
  res.json({ items });
}

async function auditForTarget(req, res) {
  const items = await listForTarget({ kind: req.params.kind, id: req.params.id });
  res.json({ items });
}

async function runJob(req, res) {
  try {
    const result = await jobs.runOnce(req.params.name);
    audit(req, 'admin.job.run', { kind: 'Job', id: null }, { name: req.params.name, result });
    res.json({ ok: true, result });
  } catch (e) { res.status(400).json({ error: e.message }); }
}

module.exports = {
  pendingVerifications,
  decideVerification,
  pendingListings,
  decideListing,
  disputes,
  resolveDispute,
  fraudFeed,
  suspendUser,
  analytics,
  listUsers,
  listAllProperties,
  auditFeed,
  auditForActor,
  auditForTarget,
  runJob,
};
