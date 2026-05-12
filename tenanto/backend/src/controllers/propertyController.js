const Property = require('../models/Property');
const Inspection = require('../models/Inspection');
const Payment = require('../models/Payment');
const { scoreAndPersist } = require('../utils/scoring');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
const { estimateDistanceAndTransport } = require('../utils/distance');
const { enforceListingLimit } = require('./subscriptionController');

/**
 * The address-protection rule (spec §"Address Protection System"):
 *
 *   - Default:                              show area only, never fullAddress
 *   - After tenant pays inspection fee:     reveal until addressVisibleUntil
 *   - After window expires:                 hide again unless an active payment exists
 *   - Landlord (owner):                     always sees fullAddress on their own listing
 *   - Admin:                                always sees fullAddress
 */
async function shouldRevealAddress(property, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (property.landlord.toString() === user._id.toString()) return true;

  const now = new Date();
  // Reveal during a paid, non-expired inspection window
  const liveInspection = await Inspection.findOne({
    property: property._id,
    tenant: user._id,
    feeStatus: { $in: ['paid', 'credited_to_rent'] },
    addressVisibleUntil: { $gt: now },
    status: { $in: ['booked', 'completed'] },
  });
  if (liveInspection) return true;

  // Reveal if tenant has an active payment in flight
  const activePayment = await Payment.findOne({
    property: property._id,
    tenant: user._id,
    escrowStatus: { $in: ['awaiting_funding', 'partially_funded', 'fully_funded', 'released'] },
  });
  return !!activePayment;
}

function sanitizeForViewer(property, reveal) {
  const obj = property.toObject ? property.toObject() : property;
  if (!reveal) delete obj.fullAddress;
  return obj;
}

async function createListing(req, res) {
  const landlord = req.user;
  if (landlord.role !== 'landlord') return res.status(403).json({ error: 'Landlords only' });
  if (!landlord.canTransact) {
    return res.status(403).json({ error: 'Account must be approved before listing' });
  }
  if (!landlord.landlordRulesAcceptedAt) {
    return res.status(403).json({
      error: 'You must accept the Landlord Platform Rules before listing',
      action: 'POST /verify/landlord-rules with { accept: true }',
    });
  }
  // Subscription tier enforcement (free tier capped at N active listings)
  const limit = await enforceListingLimit(landlord);
  if (!limit.ok) return res.status(402).json({ error: limit.reason, upgrade: '/api/subscriptions/plans' });

  const data = req.body;
  const property = await Property.create({ ...data, landlord: landlord._id, status: 'draft' });
  res.status(201).json(property);
}

async function updateListing(req, res) {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Not found' });
  if (property.landlord.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your listing' });
  }
  Object.assign(property, req.body);
  await property.save();
  res.json(property);
}

async function publishListing(req, res) {
  const property = await Property.findById(req.params.id).select('+fullAddress');
  if (!property) return res.status(404).json({ error: 'Not found' });
  if (property.landlord.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your listing' });
  }
  property.status = 'pending_review'; // Admin must approve before going live
  await property.save();

  // Auto-compute distance + transport estimate if we have coordinates
  // and a target anchor (school name or coords). Best-effort, non-fatal.
  if (property.coordinates?.lat && (property.nearSchools?.[0] || property.servingStates?.[0])) {
    try {
      const anchor = property.nearSchools?.[0]
        ? `${property.nearSchools[0]}, Nigeria`
        : `${property.servingStates[0]}, Nigeria`;
      const dist = await estimateDistanceAndTransport({
        propertyCoords: property.coordinates,
        anchor,
      });
      if (dist.distanceKm != null) property.distanceToAnchorKm = dist.distanceKm;
      if (dist.transportEstimateNaira != null) property.transportEstimate = dist.transportEstimateNaira;
      await property.save();
    } catch (e) { /* swallow */ }
  }

  // Run AI/heuristic scoring — populates property.aiScores
  let scoring = null;
  try { scoring = await scoreAndPersist(property._id); } catch (e) { /* non-fatal */ }

  res.json({ property, scoring });
}

async function listProperties(req, res) {
  const {
    school, state, area, minPrice, maxPrice, propertyType, furnishing,
    maxDistance, verifiedOnly, page = 1, limit = 20,
  } = req.query;

  const q = { status: 'active' };

  if (school) q.nearSchools = school;
  if (state) q.servingStates = state;
  if (area) q.area = new RegExp(area, 'i');
  if (propertyType) q.propertyType = propertyType;
  if (furnishing) q.furnishing = furnishing;
  if (maxDistance) q.distanceToAnchorKm = { $lte: Number(maxDistance) };
  if (minPrice || maxPrice) {
    q.annualRent = {};
    if (minPrice) q.annualRent.$gte = Number(minPrice);
    if (maxPrice) q.annualRent.$lte = Number(maxPrice);
  }

  // "Priority access to verified listings" — filter to listings whose landlord
  // is admin-approved + KYC-verified.
  if (verifiedOnly === 'true' || verifiedOnly === '1') {
    const verifiedLandlords = await require('../models/User').find({
      role: 'landlord',
      verificationStatus: 'approved',
      'landlord.adminApproved': true,
    }).select('_id');
    q.landlord = { $in: verifiedLandlords.map((u) => u._id) };
  }

  const skip = (Number(page) - 1) * Number(limit);
  // Combined priority sort: featured first, then by composite trust signal
  // (authenticity score), then by recency. Subscription tier breaks ties.
  const [items, total] = await Promise.all([
    Property.find(q)
      .sort({ featured: -1, 'aiScores.authenticity': -1, createdAt: -1 })
      .skip(skip).limit(Number(limit)),
    Property.countDocuments(q),
  ]);

  let averageRent = null;
  if (area || school || state) {
    const agg = await Property.aggregate([
      { $match: q },
      { $group: { _id: null, avg: { $avg: '$annualRent' } } },
    ]);
    averageRent = agg[0]?.avg ? Math.round(agg[0].avg) : null;
  }

  res.json({
    items: items.map((p) => sanitizeForViewer(p, false)),
    total,
    page: Number(page),
    averageRent,
  });
}

async function getProperty(req, res) {
  const property = await Property.findById(req.params.id).select('+fullAddress');
  if (!property) return res.status(404).json({ error: 'Not found' });

  // Increment view count (fire-and-forget)
  Property.updateOne({ _id: property._id }, { $inc: { viewCount: 1 } }).catch(() => {});

  const reveal = await shouldRevealAddress(property, req.user);
  res.json({
    property: sanitizeForViewer(property, reveal),
    addressRevealed: reveal,
    // Tell the client why so it can render the right CTA
    addressGate: reveal ? null : 'book_inspection',
  });
}

async function myListings(req, res) {
  const items = await Property.find({ landlord: req.user._id }).sort({ createdAt: -1 });
  res.json({ items });
}

async function recommendations(req, res) {
  // Lightweight rec heuristic — real version would be a model.
  // Students: same school, near user budget; Corpers: same state.
  const user = req.user;
  const q = { status: 'active' };
  if (user.role === 'student' && user.student?.schoolName) q.nearSchools = user.student.schoolName;
  if (user.role === 'corper' && user.corper?.stateOfService) q.servingStates = user.corper.stateOfService;

  const items = await Property.find(q)
    .sort({ 'aiScores.authenticity': -1, featured: -1, viewCount: -1 })
    .limit(10);
  res.json({ items: items.map((p) => sanitizeForViewer(p, false)) });
}

/**
 * Initiate purchase of "Featured" promotion for 30 days. ₦5,000 — adjust as needed.
 * On payment success (via webhook or /confirm-feature), property.featured is set.
 */
async function featureListing(req, res) {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Not found' });
  if (property.landlord.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your listing' });
  }
  if (property.status !== 'active') {
    return res.status(400).json({ error: 'Only active listings can be featured' });
  }
  const FEATURE_FEE_NAIRA = Number(process.env.FEATURE_FEE_NAIRA || 5000);
  const init = await initializeTransaction({
    email: req.user.email,
    amountKobo: FEATURE_FEE_NAIRA * 100,
    metadata: { propertyId: property._id.toString(), purpose: 'feature_listing' },
  });
  res.json({
    reference: init.reference,
    authorizationUrl: init.authorization_url,
    amount: FEATURE_FEE_NAIRA,
  });
}

async function confirmFeature(req, res) {
  const { reference, propertyId } = req.body;
  const property = await Property.findById(propertyId);
  if (!property) return res.status(404).json({ error: 'Not found' });
  if (property.landlord.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your listing' });
  }
  const result = await verifyTransaction(reference);
  if (result.status !== 'success') return res.status(400).json({ error: 'Payment not successful' });
  property.featured = true;
  // Set expiry 30 days out (stored as a virtual field via featuredUntil)
  property.featuredUntil = new Date(Date.now() + 30 * 24 * 3600_000);
  await property.save();
  res.json({ property });
}

/**
 * Why-was-I-flagged endpoint — admin or owning landlord can see scoring detail.
 */
async function getScoringDetail(req, res) {
  const property = await Property.findById(req.params.id);
  if (!property) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'admin' && property.landlord.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const scoring = await scoreAndPersist(property._id);
  res.json({ scoring });
}

module.exports = {
  createListing,
  updateListing,
  publishListing,
  listProperties,
  getProperty,
  myListings,
  recommendations,
  shouldRevealAddress,
  featureListing,
  confirmFeature,
  getScoringDetail,
};
