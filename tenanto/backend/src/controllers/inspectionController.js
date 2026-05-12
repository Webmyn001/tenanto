const Inspection = require('../models/Inspection');
const Property = require('../models/Property');
const Review = require('../models/Review');
const { generateInspectionToken, generateQRDataUrl } = require('../utils/qrcode');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
const { recomputeTrustScore } = require('../utils/trustScore');
const wallet = require('../utils/wallet');

const ADDRESS_WINDOW_HOURS = 48; // Reveal window after fee paid

/**
 * Step 1 — book an inspection. Returns a Paystack init for the refundable fee.
 *           Address is NOT revealed until fee is verified.
 */
async function bookInspection(req, res) {
  const tenant = req.user;
  if (!['student', 'corper'].includes(tenant.role)) {
    return res.status(403).json({ error: 'Only students or corpers can book inspections' });
  }
  if (!tenant.canTransact) {
    return res.status(403).json({ error: 'Verification required before booking' });
  }

  const { propertyId, scheduledFor } = req.body;
  const property = await Property.findById(propertyId);
  if (!property || property.status !== 'active') {
    return res.status(404).json({ error: 'Listing not available' });
  }

  const qrToken = generateInspectionToken();
  let feeDue = property.inspectionFee;
  let walletApplied = 0;

  if (req.body.applyWallet) {
    const debit = await wallet.debit(tenant._id, Math.min(feeDue, wallet.balance(tenant)), {
      reason: 'Inspection fee', ref: property._id.toString(),
    });
    walletApplied = debit.debited || 0;
    feeDue -= walletApplied;
  }

  const inspection = await Inspection.create({
    property: property._id,
    tenant: tenant._id,
    landlord: property.landlord,
    scheduledFor: new Date(scheduledFor),
    addressVisibleUntil: new Date(Date.now() + ADDRESS_WINDOW_HOURS * 3600_000),
    inspectionFee: property.inspectionFee,
    qrToken,
    status: 'booked',
  });

  // If wallet covered the whole fee, mark paid immediately and skip Paystack
  if (feeDue <= 0) {
    inspection.feeStatus = 'paid';
    inspection.feePaymentRef = 'wallet:' + inspection._id;
    await inspection.save();
    const qrDataUrl = await generateQRDataUrl(inspection.qrToken);
    return res.status(201).json({ inspection, walletApplied, qrDataUrl, payment: null });
  }

  // Otherwise initialize Paystack for the remaining amount
  const init = await initializeTransaction({
    email: tenant.email,
    amountKobo: feeDue * 100,
    metadata: { inspectionId: inspection._id.toString(), purpose: 'inspection_fee' },
  });
  inspection.feePaymentRef = init.reference;
  await inspection.save();

  res.status(201).json({
    inspection, walletApplied,
    payment: {
      reference: init.reference,
      authorizationUrl: init.authorization_url,
      amount: feeDue,
    },
  });
}

/**
 * Step 2 — confirm fee payment. Once verified, the address window opens and
 *           the QR code is generated.
 */
async function confirmFee(req, res) {
  const { reference } = req.body;
  const inspection = await Inspection.findOne({ feePaymentRef: reference });
  if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
  if (inspection.tenant.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your inspection' });
  }

  const result = await verifyTransaction(reference);
  if (result.status !== 'success') {
    return res.status(400).json({ error: 'Payment not successful' });
  }
  inspection.feeStatus = 'paid';
  // Reset visibility window from the moment the fee clears
  inspection.addressVisibleUntil = new Date(Date.now() + ADDRESS_WINDOW_HOURS * 3600_000);
  await inspection.save();

  await Property.updateOne({ _id: inspection.property }, { $inc: { inspectionCount: 1 } });

  const qrDataUrl = await generateQRDataUrl(inspection.qrToken);
  res.json({ inspection, qrDataUrl });
}

/**
 * Step 3 — landlord scans the QR at the meeting. Hitting this endpoint with
 *           the qrToken while authed as the listing's landlord proves the
 *           in-person meeting happened.
 */
async function scanQR(req, res) {
  const { qrToken } = req.params;
  const landlord = req.user;
  const inspection = await Inspection.findOne({ qrToken }).populate('property');
  if (!inspection) return res.status(404).json({ error: 'QR not recognised' });
  if (inspection.landlord.toString() !== landlord._id.toString()) {
    return res.status(403).json({ error: 'Only the listing landlord can scan' });
  }
  if (inspection.qrScannedAt) {
    return res.status(409).json({ error: 'Already scanned', scannedAt: inspection.qrScannedAt });
  }
  inspection.qrScannedAt = new Date();
  inspection.scannedByLandlordId = landlord._id;
  inspection.status = 'completed';
  await inspection.save();
  res.json({ ok: true, inspection });
}

/**
 * Step 4 — after inspection, tenant must rate before payment unlocks.
 */
async function rateAndUnlock(req, res) {
  const { rating, body, accuracy, cleanliness, landlordResponsiveness } = req.body;
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) return res.status(404).json({ error: 'Not found' });
  if (inspection.tenant.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Not your inspection' });
  }
  if (inspection.status !== 'completed') {
    return res.status(400).json({ error: 'Inspection not yet completed' });
  }
  if (inspection.tenantRated) {
    return res.status(409).json({ error: 'Already rated' });
  }

  await Review.create({
    author: req.user._id,
    subject: inspection.landlord,
    property: inspection.property,
    inspection: inspection._id,
    kind: 'post_inspection',
    rating,
    body,
    accuracy,
    cleanliness,
    landlordResponsiveness,
  });

  inspection.tenantRated = true;
  inspection.paymentUnlocked = true; // Tenant can now initiate rent payment
  await inspection.save();

  // Recompute landlord's trust score now that there's a new review
  recomputeTrustScore(inspection.landlord).catch(() => {});

  res.json({ ok: true, paymentUnlocked: true });
}

async function myInspections(req, res) {
  const role = req.user.role;
  const q = role === 'landlord' ? { landlord: req.user._id } : { tenant: req.user._id };
  const items = await Inspection.find(q).populate('property').sort({ scheduledFor: -1 });
  res.json({ items });
}

module.exports = { bookInspection, confirmFee, scanQR, rateAndUnlock, myInspections };
