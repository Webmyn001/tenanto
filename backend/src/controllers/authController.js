const User = require('../models/User');
const { sign } = require('../utils/jwt');
const { stateFromNyscCode } = require('../utils/nin');
const { sendMail } = require('../utils/email');

function publicUser(u) {
  const obj = u.toObject();
  delete obj.password;
  return obj;
}

async function register(req, res) {
  const { fullName, email, phone, password, role, acceptTerms, ...extras } = req.body;
  if (!['student', 'corper', 'landlord'].includes(role)) {
    return res.status(400).json({ error: 'role must be student | corper | landlord' });
  }
  if (!acceptTerms) {
    return res.status(400).json({ error: 'You must accept the Terms of Service to register' });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const user = new User({ fullName, email, phone, password, role });
  user.termsAcceptedAt = new Date();
  user.termsVersion = '2026-04';

  if (role === 'student') {
    user.student = {
      schoolName: extras.schoolName,
      schoolEmail: extras.schoolEmail,
      department: extras.department,
      matricNumber: extras.matricNumber,
    };
  } else if (role === 'corper') {
    user.corper = {
      stateCode: extras.stateCode,
      stateOfService: stateFromNyscCode(extras.stateCode) || extras.stateOfService,
    };
  } else if (role === 'landlord') {
    user.landlord = {
      // Landlord specific fields like bank details are added later
    };
  }

  // Generate email verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailVerificationCode = verificationCode;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await user.save();

  // Send verification email
  await sendMail({
    to: user.email,
    subject: 'Verify your Tenanto account',
    text: `Your email verification code is: ${verificationCode}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Welcome to Tenanto!</h2>
        <p>Thanks for signing up. Please verify your email address using the code below:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed; padding: 20px 0;">${verificationCode}</div>
        <p style="color: #666; font-size: 14px;">This code expires in 24 hours.</p>
      </div>
    `,
  }).catch(e => console.error('Verification email failed:', e.message));

  const token = sign({ id: user._id.toString(), role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.suspended) return res.status(403).json({ error: 'Account suspended' });

  if (!user.isEmailVerified) {
    return res.status(403).json({
      error: 'Please verify your email address before logging in.',
      unverified: true,
      email: user.email
    });
  }

  const token = sign({ id: user._id.toString(), role: user.role });
  res.json({ token, user: publicUser(user) });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // For security, don't reveal that the user doesn't exist
    return res.json({ message: 'If that email exists in our system, a code has been sent.' });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordCode = code;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Password Reset Code - Tenanto',
    text: `Your password reset code is: ${code}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>You requested a password reset. Use the code below to continue:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed; padding: 20px 0;">${code}</div>
        <p style="color: #666; font-size: 14px;">This code expires in 15 minutes.</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  res.json({ message: 'If that email exists in our system, a code has been sent.' });
}

async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordCode: code,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }

  user.password = password; // pre-save hook will hash this
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password has been reset successfully. You can now login.' });
}

async function verifyEmail(req, res) {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

  const user = await User.findOne({
    email: email.toLowerCase(),
    emailVerificationCode: code,
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired verification code' });
  }

  user.isEmailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully. You can now login.', user: publicUser(user) });
}

async function resendVerification(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.isEmailVerified) return res.status(400).json({ error: 'Email already verified' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailVerificationCode = code;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Verify your Tenanto account',
    text: `Your email verification code is: ${code}`,
    html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Verification Code</h2><p>Use the code below to verify your account:</p><h1 style="letter-spacing: 5px;">${code}</h1></div>`,
  });

  res.json({ message: 'Verification code resent' });
}

module.exports = { register, login, me, forgotPassword, resetPassword, verifyEmail, resendVerification };
