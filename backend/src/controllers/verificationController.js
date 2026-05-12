const crypto = require('crypto');
const User = require('../models/User');
const { lookupNIN } = require('../utils/nin');
const { sendMail } = require('../utils/email');
const { matchSelfieToID } = require('../utils/selfieMatch');
const { checkLiveness } = require('../utils/liveness');
const { createTransferRecipient, resolveAccount, listBanks } = require('../utils/paystack');
const schools = require('../data/schools');

// In-memory store for school-email verification codes — replace with Redis in prod
const schoolEmailCodes = new Map();

async function submitDocuments(req, res) {
  const user = req.user;
  const { documents = [], selfieUrl } = req.body;
  for (const d of documents) {
    if (!d.kind || !d.url) return res.status(400).json({ error: 'Each document needs kind + url' });
    user.documents.push(d);
  }
  if (selfieUrl) user.selfieUrl = selfieUrl;
  user.verificationStatus = 'submitted';
  await user.save();

  // If we have both a selfie and an ID document, try matching
  if (user.selfieUrl) {
    const idDoc = user.documents.find((d) => ['student_id', 'nysc_id', 'utility_bill', 'ownership_doc'].includes(d.kind));
    if (idDoc) {
      const match = await matchSelfieToID({ selfieUrl: user.selfieUrl, idUrl: idDoc.url });
      user.selfieMatchScore = match.score;
      user.selfieMatchedAt = new Date();
      await user.save();
    }

    // Liveness — orthogonal to match. A spoofed selfie can match the ID.
    const liveness = await checkLiveness({
      selfieUrl: user.selfieUrl,
      selfieVideoUrl: user.selfieVideoUrl,
    });
    user.livenessScore = liveness.score;
    user.livenessPassed = liveness.ok;
    user.livenessCheckedAt = new Date();
    await user.save();
  }

  res.json({ user });
}

/**
 * Dedicated liveness endpoint — used when the provider needs a session/token
 * (Rekognition, iProov) that the browser SDK collects then submits.
 */
async function verifyLiveness(req, res) {
  const { selfieVideoUrl, sessionId, token } = req.body;
  const user = req.user;
  if (selfieVideoUrl) user.selfieVideoUrl = selfieVideoUrl;
  if (sessionId || token) user.livenessProviderRef = sessionId || token;

  const result = await checkLiveness({
    selfieUrl: user.selfieUrl,
    selfieVideoUrl: user.selfieVideoUrl,
    sessionId, token,
  });
  user.livenessScore = result.score;
  user.livenessPassed = result.ok;
  user.livenessCheckedAt = new Date();
  await user.save();
  res.json({ ok: result.ok, score: result.score, reason: result.reason });
}

async function submitBankAccount(req, res) {
  if (req.user.role !== 'landlord') {
    return res.status(403).json({ error: 'Bank accounts are for landlords (escrow payouts)' });
  }
  const { accountNumber, bankCode, bankName } = req.body;
  if (!accountNumber || !bankCode) {
    return res.status(400).json({ error: 'accountNumber and bankCode required' });
  }

  // Resolve account name to confirm it matches the landlord
  let resolved;
  try { resolved = await resolveAccount({ accountNumber, bankCode }); }
  catch (e) { return res.status(400).json({ error: 'Could not verify account: ' + (e.response?.data?.message || e.message) }); }

  // Create Paystack Transfer Recipient
  let recipient;
  try {
    recipient = await createTransferRecipient({
      name: resolved.account_name || req.user.fullName,
      accountNumber, bankCode,
    });
  } catch (e) { return res.status(400).json({ error: 'Could not create recipient: ' + e.message }); }

  req.user.landlord = req.user.landlord || {};
  req.user.landlord.bankCode = bankCode;
  req.user.landlord.bankName = bankName;
  req.user.landlord.accountNumber = accountNumber;
  req.user.landlord.accountName = resolved.account_name;
  req.user.landlord.paystackRecipientCode = recipient.recipient_code;
  await req.user.save();

  res.json({
    accountName: resolved.account_name,
    recipientCode: recipient.recipient_code,
  });
}

async function getBanks(_req, res) {
  const banks = await listBanks();
  res.json({ banks });
}

async function verifyNIN(req, res) {
  const user = req.user;
  if (!['corper', 'landlord'].includes(user.role)) {
    return res.status(400).json({ error: 'Only corpers and landlords need NIN' });
  }
  const { nin } = req.body;
  const result = await lookupNIN(nin);
  if (!result.ok) return res.status(400).json({ error: result.reason });

  if (user.role === 'corper') {
    user.corper.nin = nin;
    user.corper.ninVerified = true;
  } else {
    user.landlord.nin = nin;
    user.landlord.ninVerified = true;
  }
  await user.save();
  res.json({ verified: true, name: `${result.firstName || ''} ${result.lastName || ''}`.trim() });
}

async function startSchoolEmailVerification(req, res) {
  const user = req.user;
  if (user.role !== 'student') return res.status(400).json({ error: 'Students only' });
  const { schoolEmail } = req.body;
  if (!/\.edu\.ng$/i.test(schoolEmail || '')) {
    return res.status(400).json({ error: 'School email must end in .edu.ng' });
  }

  // Validate against the school registry — the email domain should match the
  // student's selected school (defence in depth against fake .edu.ng domains).
  const domain = schoolEmail.split('@')[1]?.toLowerCase();
  if (user.student?.schoolName) {
    const school = schools.find((s) => s.name === user.student.schoolName);
    if (school && !school.domains.some((d) => domain === d || domain.endsWith('.' + d))) {
      return res.status(400).json({
        error: `Email domain '${domain}' doesn't match your school (${school.name}). Expected: ${school.domains.join(', ')}`,
      });
    }
  }

  const code = crypto.randomInt(100000, 999999).toString();
  schoolEmailCodes.set(user._id.toString(), { code, schoolEmail, expiresAt: Date.now() + 15 * 60_000 });

  await sendMail({
    to: schoolEmail,
    subject: 'Verify your school email — Tenanto',
    text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, ignore this email.`,
  }).catch((e) => console.warn('[email] send failed:', e.message));

  const dev = process.env.NODE_ENV !== 'production';
  res.json({ sent: true, ...(dev && { devCode: code }) });
}

async function confirmSchoolEmail(req, res) {
  const user = req.user;
  const { code } = req.body;
  const entry = schoolEmailCodes.get(user._id.toString());
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: 'Code expired — request a new one' });
  }
  if (entry.code !== code) return res.status(400).json({ error: 'Wrong code' });
  user.student.schoolEmail = entry.schoolEmail;
  user.student.schoolEmailVerified = true;
  await user.save();
  schoolEmailCodes.delete(user._id.toString());
  res.json({ verified: true });
}

async function acceptLandlordRules(req, res) {
  if (req.user.role !== 'landlord') {
    return res.status(403).json({ error: 'Landlords only' });
  }
  if (req.body.accept !== true) {
    return res.status(400).json({ error: 'Body must include { accept: true }' });
  }
  req.user.landlordRulesAcceptedAt = new Date();
  req.user.landlordRulesVersion = '2026-04';
  await req.user.save();
  res.json({ accepted: true, version: req.user.landlordRulesVersion });
}

module.exports = {
  submitDocuments,
  verifyNIN,
  startSchoolEmailVerification,
  confirmSchoolEmail,
  submitBankAccount,
  getBanks,
  verifyLiveness,
  acceptLandlordRules,
};
