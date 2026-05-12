const Review = require('../models/Review');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { recomputeTrustScore } = require('../utils/trustScore');

/**
 * Landlord rates tenant after the tenancy is established (escrow released).
 * The complementary direction (tenant→landlord) lives in inspectionController
 * as `rateAndUnlock` — that's the post-inspection rating.
 */
async function rateTenant(req, res) {
  const { paymentId, rating, body } = req.body;
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (payment.landlord.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the landlord on this payment can rate' });
  }
  if (payment.escrowStatus !== 'released') {
    return res.status(400).json({ error: 'Tenant can only be rated once escrow is released' });
  }

  const exists = await Review.findOne({
    author: req.user._id, subject: payment.tenant, kind: 'tenancy', property: payment.property,
  });
  if (exists) return res.status(409).json({ error: 'Already rated this tenant for this tenancy' });

  await Review.create({
    author: req.user._id, subject: payment.tenant,
    property: payment.property, kind: 'tenancy', rating, body,
  });

  await recomputeTrustScore(payment.tenant);
  res.json({ ok: true });
}

async function listForUser(req, res) {
  const items = await Review.find({ subject: req.params.userId })
    .populate('author', 'fullName role')
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ items });
}

module.exports = { rateTenant, listForUser };
