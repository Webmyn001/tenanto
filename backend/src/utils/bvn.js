const axios = require('axios');

async function lookupBVN(bvn) {
  if (!/^\d{11}$/.test(bvn || '')) return { ok: false, reason: 'BVN must be 11 digits' };
  if (process.env.MOCK_THIRD_PARTY === 'true') {
    const ok = Number(bvn.slice(-1)) % 2 === 0;
    return ok
      ? { ok: true, firstName: 'Test', lastName: 'User', bvn }
      : { ok: false, reason: 'BVN not found in mock registry (use a BVN ending in an even digit)' };
  }
  try {
    const { data } = await axios.post(
      'https://api.prembly.com/verification/bvn_validation',
      { number: bvn },
      { headers: { 'x-api-key': process.env.PREMBLY_API_KEY || '' }, timeout: 15_000 }
    );
    if (!data?.status) return { ok: false, reason: data?.detail || 'BVN verification failed' };
    return { ok: true, firstName: data.data.firstName, lastName: data.data.lastName, bvn };
  } catch (e) {
    return { ok: false, reason: e.response?.data?.detail || e.message };
  }
}

module.exports = { lookupBVN };
