const User = require('../models/User');
const schools = require('../data/schools');

async function lookupByEmail(req, res) {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = await User.findOne({ email }).select('_id fullName email role verificationStatus');
  if (!user) return res.status(404).json({ error: 'No user with that email' });
  res.json({ user });
}

async function listSchools(_req, res) {
  res.json({ schools });
}

module.exports = { lookupByEmail, listSchools };
