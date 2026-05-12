const User = require('../models/User');
const { sign } = require('../utils/jwt');
const { stateFromNyscCode } = require('../utils/nin');

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
  }

  await user.save();
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

  const token = sign({ id: user._id.toString(), role: user.role });
  res.json({ token, user: publicUser(user) });
}

async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

module.exports = { register, login, me };
