const User = require('../models/User');
const Property = require('../models/Property');
const { createPlan, createCustomer, createSubscription, disableSubscription } = require('../utils/paystack');
const { logger } = require('../utils/logger');

/**
 * Subscription tiers — kept in code rather than DB so changes need a deploy.
 * Each tier maps to a Paystack Plan that we lazily create on first use.
 */
const TIERS = {
  free: { id: 'free', label: 'Free', priceNaira: 0, maxActiveListings: 3, priorityBoost: 0 },
  pro: {
    id: 'pro', label: 'Pro', priceNaira: 5000, interval: 'monthly',
    maxActiveListings: Infinity, priorityBoost: 1,
    perks: ['Unlimited active listings', 'Priority placement in search', 'Featured-listing credit (1/mo)'],
  },
  enterprise: {
    id: 'enterprise', label: 'Enterprise', priceNaira: 50000, interval: 'monthly',
    maxActiveListings: Infinity, priorityBoost: 2,
    perks: ['Everything in Pro', 'Multi-user access', 'Dedicated account manager', 'Bulk listing import'],
  },
};

// Cache plan codes after first creation
const planCodeCache = new Map();

async function ensurePlan(tierId) {
  const tier = TIERS[tierId];
  if (!tier || tier.priceNaira === 0) return null;
  if (planCodeCache.has(tierId)) return planCodeCache.get(tierId);
  const plan = await createPlan({
    name: `Tenanto ${tier.label}`,
    amountKobo: tier.priceNaira * 100,
    interval: tier.interval,
  });
  planCodeCache.set(tierId, plan.plan_code);
  return plan.plan_code;
}

async function listPlans(_req, res) {
  res.json({ tiers: Object.values(TIERS) });
}

async function subscribe(req, res) {
  const { tier } = req.body;
  if (!TIERS[tier] || tier === 'free') {
    return res.status(400).json({ error: 'Pick a paid tier (pro or enterprise)' });
  }

  // Lazy-create or look up Paystack customer
  let customerCode = req.user.subscription?.paystackCustomerCode;
  if (!customerCode) {
    const cus = await createCustomer({
      email: req.user.email,
      firstName: req.user.fullName.split(' ')[0],
      lastName: req.user.fullName.split(' ').slice(1).join(' ') || '-',
      phone: req.user.phone,
    });
    customerCode = cus.customer_code;
  }

  const planCode = await ensurePlan(tier);
  const sub = await createSubscription({ customerCode, planCode });

  req.user.subscription = {
    tier,
    status: sub.status === 'active' ? 'active' : 'past_due',
    currentPeriodEnd: sub.next_payment_date ? new Date(sub.next_payment_date) : undefined,
    paystackPlanCode: planCode,
    paystackSubscriptionCode: sub.subscription_code,
    paystackCustomerCode: customerCode,
  };
  await req.user.save();

  logger.info({ userId: req.user._id, tier, sub: sub.subscription_code }, '[subs] subscribed');
  res.json({ subscription: req.user.subscription, paystack: { authorization_url: sub.authorization_url || null } });
}

async function cancel(req, res) {
  if (req.user.subscription?.status !== 'active') {
    return res.status(400).json({ error: 'No active subscription' });
  }
  await disableSubscription({
    subscriptionCode: req.user.subscription.paystackSubscriptionCode,
    emailToken: 'platform-cancel', // Paystack accepts the email_token from the subscription email; in dashboard-driven cancels we use a stored token
  });
  req.user.subscription.status = 'cancelled';
  await req.user.save();
  res.json({ subscription: req.user.subscription });
}

async function mySubscription(req, res) {
  res.json({ subscription: req.user.subscription || { tier: 'free', status: 'none' } });
}

/**
 * Middleware-style helper used by propertyController.createListing to enforce
 * the free-tier listing cap.
 */
async function enforceListingLimit(user) {
  const tier = TIERS[user.subscription?.tier || 'free'];
  if (tier.maxActiveListings === Infinity) return { ok: true };
  if (user.subscription?.status === 'active' && tier.id !== 'free') return { ok: true };
  const count = await Property.countDocuments({
    landlord: user._id, status: { $in: ['active', 'pending_review'] },
  });
  if (count >= tier.maxActiveListings) {
    return {
      ok: false,
      reason: `Free tier is limited to ${tier.maxActiveListings} active listings. Upgrade to Pro for unlimited listings.`,
    };
  }
  return { ok: true };
}

module.exports = { listPlans, subscribe, cancel, mySubscription, enforceListingLimit, TIERS };
