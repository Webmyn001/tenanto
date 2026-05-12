/**
 * Paystack wrapper.
 *
 * In production, calls api.paystack.co with PAYSTACK_SECRET_KEY.
 * In dev (MOCK_THIRD_PARTY=true), returns deterministic fake responses so the
 * full escrow flow can be exercised without real card movement.
 */

const axios = require('axios');
const crypto = require('crypto');

const isMock = () => process.env.MOCK_THIRD_PARTY === 'true';

function mockRef(prefix = 'mock') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

const client = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  timeout: 10_000,
});

async function initializeTransaction({ email, amountKobo, metadata }) {
  if (isMock()) {
    const reference = mockRef('init');
    return {
      reference,
      authorization_url: `${process.env.CLIENT_URL}/payments/mock-checkout?ref=${reference}`,
      access_code: 'mock_access',
    };
  }
  const { data } = await client.post('/transaction/initialize', {
    email,
    amount: amountKobo,
    metadata,
  });
  return data.data;
}

async function verifyTransaction(reference) {
  if (isMock()) {
    return { status: 'success', reference, amount: 0, gateway_response: 'Mock approved' };
  }
  const { data } = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return data.data;
}

// Used for releasing escrowed money to landlord — Paystack Transfers
async function transferToLandlord({ recipientCode, amountKobo, reason }) {
  if (isMock()) {
    return { status: 'success', transfer_code: mockRef('xfer'), amount: amountKobo, reason };
  }
  const { data } = await client.post('/transfer', {
    source: 'balance',
    amount: amountKobo,
    recipient: recipientCode,
    reason,
  });
  return data.data;
}

/**
 * Create a Paystack Transfer Recipient for a landlord. Should be called
 * during landlord verification once admin approves them and they've supplied
 * a bank account. Returns the recipient_code that must be stored on the user
 * for transferToLandlord to succeed.
 */
async function createTransferRecipient({ name, accountNumber, bankCode, currency = 'NGN' }) {
  if (isMock()) {
    return { recipient_code: mockRef('rcp'), active: true, name, details: { account_number: accountNumber, bank_code: bankCode } };
  }
  const { data } = await client.post('/transferrecipient', {
    type: 'nuban',
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency,
  });
  return data.data;
}

/**
 * Resolve / verify a NUBAN account before creating a recipient. Helps catch
 * typos in account numbers at verification time.
 */
async function resolveAccount({ accountNumber, bankCode }) {
  if (isMock()) return { account_number: accountNumber, account_name: 'MOCK ACCOUNT' };
  const { data } = await client.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  return data.data;
}

async function listBanks() {
  if (isMock()) {
    return [
      { name: 'Mock Bank', code: '999', country: 'Nigeria' },
      { name: 'Access Bank', code: '044', country: 'Nigeria' },
      { name: 'GTBank', code: '058', country: 'Nigeria' },
    ];
  }
  const { data } = await client.get('/bank?country=nigeria');
  return data.data;
}

// ─── Subscriptions ────────────────────────────────────────────────────────

async function createPlan({ name, amountKobo, interval = 'monthly' }) {
  if (isMock()) return { plan_code: mockRef('plan'), name, amount: amountKobo, interval };
  const { data } = await client.post('/plan', { name, amount: amountKobo, interval });
  return data.data;
}

async function createCustomer({ email, firstName, lastName, phone }) {
  if (isMock()) return { customer_code: mockRef('cus'), email };
  const { data } = await client.post('/customer', { email, first_name: firstName, last_name: lastName, phone });
  return data.data;
}

async function createSubscription({ customerCode, planCode }) {
  if (isMock()) {
    const monthFromNow = new Date(Date.now() + 30 * 24 * 3600_000);
    return {
      subscription_code: mockRef('sub'),
      status: 'active',
      next_payment_date: monthFromNow.toISOString(),
      email_token: 'mock_token',
    };
  }
  const { data } = await client.post('/subscription', { customer: customerCode, plan: planCode });
  return data.data;
}

async function disableSubscription({ subscriptionCode, emailToken }) {
  if (isMock()) return { status: 'disabled', subscription_code: subscriptionCode };
  const { data } = await client.post('/subscription/disable', { code: subscriptionCode, token: emailToken });
  return data.data;
}

function verifyWebhookSignature(rawBody, signature) {
  if (isMock()) return true;
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  transferToLandlord,
  createTransferRecipient,
  resolveAccount,
  listBanks,
  createPlan,
  createCustomer,
  createSubscription,
  disableSubscription,
  verifyWebhookSignature,
};
