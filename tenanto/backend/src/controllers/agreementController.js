const Agreement = require('../models/Agreement');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const User = require('../models/User');
const { renderAgreementPDF, makeSignatureHash } = require('../utils/agreementPdf');

async function loadFullContext(agreement) {
  const [payment, property, tenant, landlord] = await Promise.all([
    Payment.findById(agreement.payment),
    Property.findById(agreement.property).select('+fullAddress'),
    User.findById(agreement.tenant),
    User.findById(agreement.landlord),
  ]);
  return { agreement, payment, property, tenant, landlord };
}

function isParty(agreement, user) {
  if (user.role === 'admin') return true;
  return (
    agreement.tenant.toString() === user._id.toString() ||
    agreement.landlord.toString() === user._id.toString()
  );
}

async function getByPayment(req, res) {
  const agreement = await Agreement.findOne({ payment: req.params.paymentId });
  if (!agreement) return res.status(404).json({ error: 'No agreement yet — escrow must be fully funded first.' });
  if (!isParty(agreement, req.user)) return res.status(403).json({ error: 'Not your agreement' });
  res.json({ agreement });
}

async function getOne(req, res) {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ error: 'Not found' });
  if (!isParty(agreement, req.user)) return res.status(403).json({ error: 'Not your agreement' });
  res.json({ agreement });
}

async function sign(req, res) {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ error: 'Not found' });
  if (!isParty(agreement, req.user)) return res.status(403).json({ error: 'Not your agreement' });

  const isTenant = agreement.tenant.toString() === req.user._id.toString();
  const isLandlord = agreement.landlord.toString() === req.user._id.toString();
  if (!isTenant && !isLandlord) return res.status(403).json({ error: 'Only parties can sign' });

  const signedAt = new Date();
  const hash = makeSignatureHash({
    userId: req.user._id.toString(),
    paymentId: agreement.payment.toString(),
    signedAt,
  });

  if (isTenant) {
    if (agreement.tenantSignedAt) return res.status(409).json({ error: 'Already signed' });
    agreement.tenantSignedAt = signedAt;
    agreement.tenantSignatureHash = hash;
  } else {
    if (agreement.landlordSignedAt) return res.status(409).json({ error: 'Already signed' });
    agreement.landlordSignedAt = signedAt;
    agreement.landlordSignatureHash = hash;
  }
  await agreement.save();
  res.json({ agreement });
}

async function downloadPdf(req, res) {
  const agreement = await Agreement.findById(req.params.id);
  if (!agreement) return res.status(404).json({ error: 'Not found' });
  if (!isParty(agreement, req.user)) return res.status(403).json({ error: 'Not your agreement' });

  const ctx = await loadFullContext(agreement);
  const buf = await renderAgreementPDF(ctx);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="agreement-${agreement._id}.pdf"`);
  res.send(buf);
}

module.exports = { getByPayment, getOne, sign, downloadPdf };
