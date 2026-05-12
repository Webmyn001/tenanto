const User = require('../models/User');

async function getMyWallet(req, res) {
  const user = await User.findById(req.user._id).select('wallet');
  const w = user?.wallet || { balance: 0, transactions: [] };
  res.json({
    balance: w.balance || 0,
    transactions: (w.transactions || []).slice(0, 50),
  });
}

module.exports = { getMyWallet };
