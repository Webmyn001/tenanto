/**
 * Wallet operations — append-only transaction log on the User doc.
 *
 * Two ways to earn:
 *   - 1% rent cashback on successful move-in confirmation
 *   - Future: referrals, promotional credits
 *
 * Two ways to spend:
 *   - Inspection booking fee (full or partial)
 *   - Rent platform fee (5% tenant cut)
 *
 * Wallet is the spec's "Cashback or discount for in-app payment" incentive.
 */
const User = require('../models/User');
const { logger } = require('./logger');

const MAX_TRANSACTIONS = 200; // keep the latest N inline; ship to a separate model when this gets cramped

function pushTxn(user, txn) {
  user.wallet = user.wallet || { balance: 0, transactions: [] };
  user.wallet.transactions = user.wallet.transactions || [];
  user.wallet.transactions.unshift({ ...txn, at: new Date(), balanceAfter: user.wallet.balance });
  if (user.wallet.transactions.length > MAX_TRANSACTIONS) {
    user.wallet.transactions = user.wallet.transactions.slice(0, MAX_TRANSACTIONS);
  }
}

async function credit(userId, amount, { reason, ref } = {}) {
  if (!amount || amount <= 0) return null;
  const user = await User.findById(userId);
  if (!user) return null;
  user.wallet = user.wallet || { balance: 0, transactions: [] };
  user.wallet.balance = (user.wallet.balance || 0) + Math.round(amount);
  pushTxn(user, { type: 'credit', amount: Math.round(amount), reason, ref });
  await user.save();
  logger.info({ userId: user._id, amount, reason, balance: user.wallet.balance }, '[wallet] credit');
  return user.wallet.balance;
}

async function debit(userId, amount, { reason, ref } = {}) {
  if (!amount || amount <= 0) return { ok: true, debited: 0 };
  const user = await User.findById(userId);
  if (!user) return { ok: false, reason: 'user not found' };
  user.wallet = user.wallet || { balance: 0, transactions: [] };
  const available = user.wallet.balance || 0;
  const taking = Math.min(available, Math.round(amount));
  if (taking === 0) return { ok: true, debited: 0, balance: available };
  user.wallet.balance = available - taking;
  pushTxn(user, { type: 'debit', amount: taking, reason, ref });
  await user.save();
  logger.info({ userId: user._id, taking, reason, balance: user.wallet.balance }, '[wallet] debit');
  return { ok: true, debited: taking, balance: user.wallet.balance };
}

function balance(user) {
  return user?.wallet?.balance || 0;
}

module.exports = { credit, debit, balance };
