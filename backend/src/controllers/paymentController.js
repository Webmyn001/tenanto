const Payment = require('../models/Payment');
const Property = require('../models/Property');
const Inspection = require('../models/Inspection');
const Agreement = require('../models/Agreement');
const User = require('../models/User');
const ProcessedWebhook = require('../models/ProcessedWebhook');
const wallet = require('../utils/wallet');
const crypto = require('crypto');
const {
  initializeTransaction,
  verifyTransaction,
  transferToLandlord,
  verifyWebhookSignature,
} = require('../utils/paystack');

const LANDLORD_FEE = 0.10; // 10%
const TENANT_FEE = 0.05;   // 5%

/**
 * Step 1 — initiate a payment (full / installment / group). Tenant must have
 *           a paymentUnlocked inspection on this property.
 */
async function initiate(req, res) {
  const tenant = req.user;
  const { propertyId, paymentMode, installmentMonths, contributors = [] } = req.body;

  const property = await Property.findById(propertyId).select('+fullAddress');
  if (!property) return res.status(404).json({ error: 'Property not found' });

  // Lock-in: must have a completed inspection that the tenant has rated
  const inspection = await Inspection.findOne({
    property: property._id,
    tenant: tenant._id,
    paymentUnlocked: true,
  });
  if (!inspection) {
    return res.status(403).json({
      error: 'You must complete and rate an inspection before paying',
    });
  }

  const inspectionCredit = inspection.feeStatus === 'paid' ? inspection.inspectionFee : 0;
  const platformFeeLandlord = Math.round(property.annualRent * LANDLORD_FEE);
  const platformFeeTenant = Math.round(property.annualRent * TENANT_FEE);
  let totalDue =
    property.annualRent +
    (property.serviceCharge || 0) +
    (property.cautionFee || 0) +
    platformFeeTenant -
    inspectionCredit;

  // Optionally apply wallet credit (the spec's "Cashback or discount for in-app payment")
  let walletApplied = 0;
  if (req.body.applyWallet) {
    const debit = await wallet.debit(tenant._id, Math.min(totalDue, wallet.balance(tenant)), {
      reason: 'Rent payment',
      ref: property._id.toString(),
    });
    walletApplied = debit.debited || 0;
    totalDue -= walletApplied;
  }

  const payment = new Payment({
    property: property._id,
    tenant: tenant._id,
    landlord: property.landlord,
    inspection: inspection._id,
    rentAmount: property.annualRent,
    serviceCharge: property.serviceCharge || 0,
    cautionFee: property.cautionFee || 0,
    inspectionCredit,
    walletApplied,
    platformFeeLandlord,
    platformFeeTenant,
    totalDue,
    paymentMode,
  });

  if (paymentMode === 'installment') {
    if (!property.installmentEnabled) {
      return res.status(400).json({ error: 'Landlord has not enabled installments' });
    }
    const months = installmentMonths || property.installmentPlan?.months || 6;
    const monthly = Math.ceil(totalDue / months);
    payment.installments = Array.from({ length: months }, (_, i) => ({
      dueDate: new Date(Date.now() + i * 30 * 24 * 3600_000),
      amount: i === months - 1 ? totalDue - monthly * (months - 1) : monthly,
    }));
  } else if (paymentMode === 'group') {
    if (!Array.isArray(contributors) || contributors.length === 0) {
      return res.status(400).json({ error: 'Group payments need contributors[]' });
    }
    const sum = contributors.reduce((s, c) => s + Number(c.amount || 0), 0);
    if (sum !== totalDue) {
      return res.status(400).json({ error: `Contributor amounts sum to ${sum}, must equal ${totalDue}` });
    }
    payment.contributors = contributors;
  }

  // Mark inspection fee as credited towards rent (one-shot)
  if (inspectionCredit > 0) {
    inspection.feeStatus = 'credited_to_rent';
    await inspection.save();
  }

  await payment.save();

  // For full mode, kick off Paystack init immediately
  let initData = null;
  if (paymentMode === 'full') {
    const init = await initializeTransaction({
      email: tenant.email,
      amountKobo: totalDue * 100,
      metadata: { paymentId: payment._id.toString(), purpose: 'rent_full' },
    });
    initData = { reference: init.reference, authorizationUrl: init.authorization_url };
  }

  res.status(201).json({ payment, init: initData });
}

/**
 * Pay one slice — used for installments and per-contributor group funding.
 */
async function payInstallmentOrShare(req, res) {
  const { paymentId, index, contributorUserId } = req.body;
  const payment = await Payment.findById(paymentId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  let amount, target;

  if (payment.paymentMode === 'installment') {
    target = payment.installments[index];
    if (!target) return res.status(400).json({ error: 'Bad installment index' });
    if (target.paid) return res.status(409).json({ error: 'Already paid' });
    if (payment.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only lead tenant pays installments' });
    }
    amount = target.amount;
  } else if (payment.paymentMode === 'group') {
    target = payment.contributors.find((c) => c.user.toString() === (contributorUserId || req.user._id.toString()));
    if (!target) return res.status(400).json({ error: 'You are not a contributor' });
    if (target.paid) return res.status(409).json({ error: 'Already paid' });
    amount = target.amount;
  } else {
    return res.status(400).json({ error: 'Use /confirm for full-mode payments' });
  }

  const init = await initializeTransaction({
    email: req.user.email,
    amountKobo: amount * 100,
    metadata: { paymentId: payment._id.toString(), purpose: 'rent_slice' },
  });
  target.paystackRef = init.reference;
  await payment.save();
  res.json({ reference: init.reference, authorizationUrl: init.authorization_url, amount });
}

/**
 * Confirm a Paystack reference. Updates the right slot and recomputes escrow status.
 * (In production, the canonical source of truth is the Paystack webhook below — this
 *  endpoint exists for the client to poll faster after returning from checkout.)
 */
async function confirm(req, res) {
  const { reference } = req.body;
  const result = await verifyTransaction(reference);
  if (result.status !== 'success') return res.status(400).json({ error: 'Payment not successful' });

  // Find the payment that owns this reference
  const payment = await Payment.findOne({
    $or: [
      { 'installments.paystackRef': reference },
      { 'contributors.paystackRef': reference },
    ],
  });

  let updated;
  if (payment) {
    updated = applyReference(payment, reference);
    await updated.save();
    return res.json({ payment: updated });
  }

  // Full-mode payments don't have ref stored on a slot — look up via metadata
  // (in mock mode metadata isn't returned; client passes paymentId)
  if (req.body.paymentId) {
    const full = await Payment.findById(req.body.paymentId);
    if (!full) return res.status(404).json({ error: 'Payment not found' });
    full.escrowStatus = 'fully_funded';
    full.escrowFundedAt = new Date();
    await full.save();
    await maybeAutoGenerateAgreement(full);
    return res.json({ payment: full });
  }
  return res.status(404).json({ error: 'Reference not found on any payment' });
}

function applyReference(payment, reference) {
  const now = new Date();
  for (const inst of payment.installments) {
    if (inst.paystackRef === reference && !inst.paid) {
      inst.paid = true; inst.paidAt = now;
    }
  }
  for (const c of payment.contributors) {
    if (c.paystackRef === reference && !c.paid) {
      c.paid = true; c.paidAt = now;
    }
  }
  // Recompute escrow status
  let funded = 0;
  if (payment.paymentMode === 'installment') {
    funded = payment.installments.filter((i) => i.paid).length;
    if (funded === 0) payment.escrowStatus = 'awaiting_funding';
    else if (funded < payment.installments.length) payment.escrowStatus = 'partially_funded';
    else { payment.escrowStatus = 'fully_funded'; payment.escrowFundedAt = now; }
  } else if (payment.paymentMode === 'group') {
    const total = payment.contributors.length;
    funded = payment.contributors.filter((c) => c.paid).length;
    if (funded === 0) payment.escrowStatus = 'awaiting_funding';
    else if (funded < total) payment.escrowStatus = 'partially_funded';
    else { payment.escrowStatus = 'fully_funded'; payment.escrowFundedAt = now; }
  }
  return payment;
}

async function maybeAutoGenerateAgreement(payment) {
  const exists = await Agreement.findOne({ payment: payment._id });
  if (exists) return;
  const property = await Property.findById(payment.property).select('+fullAddress');
  const tenant = await User.findById(payment.tenant);
  const landlord = await User.findById(payment.landlord);
  const body = `# Tenancy Agreement

**Property:** ${property.title}
**Address:** ${property.fullAddress}
**Annual Rent:** ₦${payment.rentAmount.toLocaleString()}
**Payment Mode:** ${payment.paymentMode}
**Tenant:** ${tenant.fullName}
**Landlord:** ${landlord.fullName}
**Date:** ${new Date().toDateString()}

Both parties agree to the terms set out by Tenanto's standard tenancy
agreement template, including escrow protection, dispute resolution, and a
no-bypass clause that voids platform protections if rent is paid outside
the platform.`;
  await Agreement.create({
    payment: payment._id,
    property: property._id,
    tenant: tenant._id,
    landlord: landlord._id,
    body,
  });
}

/**
 * Tenant confirms move-in. Releases escrow to landlord (minus platform fees).
 */
async function confirmMoveIn(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  if (payment.tenant.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the tenant can confirm move-in' });
  }
  if (payment.escrowStatus !== 'fully_funded') {
    return res.status(400).json({ error: 'Escrow not fully funded' });
  }

  // Net to landlord = rent - landlord fee + service charge + caution
  const net = payment.rentAmount - payment.platformFeeLandlord + payment.serviceCharge + payment.cautionFee;

  const landlord = await User.findById(payment.landlord);
  const transfer = await transferToLandlord({
    recipientCode: landlord.paystackRecipientCode || 'mock_recipient',
    amountKobo: net * 100,
    reason: `Rent release for ${payment.property}`,
  });

  payment.moveInConfirmedAt = new Date();
  payment.releasedAt = new Date();
  payment.escrowStatus = 'released';
  await payment.save();

  // Cashback: 1% of rent credited to tenant wallet (in-app payment incentive)
  const cashback = Math.round(payment.rentAmount * 0.01);
  if (cashback > 0) {
    await wallet.credit(payment.tenant, cashback, {
      reason: '1% rent cashback on move-in',
      ref: payment._id.toString(),
    });
  }

  res.json({ payment, transfer, cashback });
}

async function openDispute(req, res) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  if (payment.tenant.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the tenant can dispute' });
  }
  if (!['fully_funded', 'partially_funded'].includes(payment.escrowStatus)) {
    return res.status(400).json({ error: 'Cannot dispute a payment in this state' });
  }
  payment.escrowStatus = 'disputed';
  payment.disputeReason = req.body.reason;
  await payment.save();
  res.json({ payment });
}

/**
 * Paystack webhook — canonical truth. Mounted with raw body parser in routes.
 * Idempotent: each event.data.id is recorded once via ProcessedWebhook.
 */
async function webhook(req, res) {
  const signature = req.headers['x-paystack-signature'];
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    return res.status(400).json({ error: 'Bad signature' });
  }
  const event = req.body;
  const eventId = String(event?.data?.id || event?.id || '');
  if (eventId) {
    try {
      await ProcessedWebhook.create({
        provider: 'paystack', eventId, eventType: event.event,
      });
    } catch (e) {
      // Duplicate event — already processed. Ack so Paystack stops retrying.
      if (e.code === 11000) return res.json({ received: true, duplicate: true });
      throw e;
    }
  }

  if (event.event === 'charge.success') {
    const ref = event.data.reference;
    const inspection = await Inspection.findOne({ feePaymentRef: ref });
    if (inspection) {
      inspection.feeStatus = 'paid';
      await inspection.save();
    }
    const payment = await Payment.findOne({
      $or: [{ 'installments.paystackRef': ref }, { 'contributors.paystackRef': ref }],
    });
    if (payment) {
      const updated = applyReference(payment, ref);
      await updated.save();
      if (updated.escrowStatus === 'fully_funded') {
        await maybeAutoGenerateAgreement(updated);
      }
    }
  }

  // Subscription lifecycle events
  if (event.event === 'subscription.create' || event.event === 'subscription.enable') {
    const sub = event.data;
    const user = await User.findOne({ 'subscription.paystackSubscriptionCode': sub.subscription_code });
    if (user) {
      user.subscription.status = 'active';
      user.subscription.currentPeriodEnd = sub.next_payment_date ? new Date(sub.next_payment_date) : user.subscription.currentPeriodEnd;
      await user.save();
    }
  }
  if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
    const sub = event.data;
    const user = await User.findOne({ 'subscription.paystackSubscriptionCode': sub.subscription_code });
    if (user) {
      user.subscription.status = 'cancelled';
      await user.save();
    }
  }
  if (event.event === 'invoice.payment_failed') {
    const sub = event.data?.subscription;
    if (sub?.subscription_code) {
      const user = await User.findOne({ 'subscription.paystackSubscriptionCode': sub.subscription_code });
      if (user) { user.subscription.status = 'past_due'; await user.save(); }
    }
  }
  res.json({ received: true });
}

/**
 * List payments visible to the requester. Tenants see their own; landlords
 * see payments against their listings; admin sees all.
 */
async function myPayments(req, res) {
  let q;
  if (req.user.role === 'admin') q = {};
  else if (req.user.role === 'landlord') q = { landlord: req.user._id };
  else q = { tenant: req.user._id };

  const items = await Payment.find(q)
    .populate('property', 'title area annualRent')
    .sort({ createdAt: -1 });

  // Attach agreementId for each, in one query
  const ids = items.map((p) => p._id);
  const agreements = await Agreement.find({ payment: { $in: ids } }).select('payment tenantSignedAt landlordSignedAt');
  const byPayment = new Map(agreements.map((a) => [a.payment.toString(), a]));

  const enriched = items.map((p) => {
    const a = byPayment.get(p._id.toString());
    return {
      ...p.toObject(),
      agreement: a
        ? {
            _id: a._id,
            tenantSigned: !!a.tenantSignedAt,
            landlordSigned: !!a.landlordSignedAt,
          }
        : null,
    };
  });

  res.json({ items: enriched });
}

module.exports = {
  initiate,
  payInstallmentOrShare,
  confirm,
  confirmMoveIn,
  openDispute,
  webhook,
  myPayments,
};
