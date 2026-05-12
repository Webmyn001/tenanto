/**
 * Multi-provider NIN verification.
 *
 * Set NIN_PROVIDER to one of: 'dojah' | 'verifyme' | 'youverify' | 'smileid' | 'mock'
 * Each provider gets its own credentials block — see .env.example.
 *
 * All adapters return: { ok, firstName?, lastName?, dob?, photoUrl?, reason? }
 */
const axios = require('axios');

const STATE_BY_CODE = {
  AB: 'Abia', AD: 'Adamawa', AK: 'Akwa Ibom', AN: 'Anambra', BA: 'Bauchi',
  BY: 'Bayelsa', BE: 'Benue', BO: 'Borno', CR: 'Cross River', DE: 'Delta',
  EB: 'Ebonyi', ED: 'Edo', EK: 'Ekiti', EN: 'Enugu', FC: 'FCT (Abuja)',
  GO: 'Gombe', IM: 'Imo', JI: 'Jigawa', KD: 'Kaduna', KN: 'Kano',
  KT: 'Katsina', KE: 'Kebbi', KO: 'Kogi', KW: 'Kwara', LA: 'Lagos',
  NA: 'Nasarawa', NI: 'Niger', OG: 'Ogun', ON: 'Ondo', OS: 'Osun',
  OY: 'Oyo', PL: 'Plateau', RI: 'Rivers', SO: 'Sokoto', TA: 'Taraba',
  YO: 'Yobe', ZA: 'Zamfara',
};

function stateFromNyscCode(stateCode) {
  if (!stateCode) return null;
  const prefix = stateCode.slice(0, 2).toUpperCase();
  return STATE_BY_CODE[prefix] || null;
}

// ─── Adapters ──────────────────────────────────────────────────────────────

async function dojah(nin) {
  const { data } = await axios.get(
    'https://api.dojah.io/api/v1/kyc/nin',
    { params: { nin }, headers: {
      AppId: process.env.DOJAH_APP_ID,
      Authorization: process.env.DOJAH_API_KEY,
    }, timeout: 10_000 }
  );
  const e = data?.entity;
  if (!e) return { ok: false, reason: 'No entity returned' };
  return { ok: true, firstName: e.first_name, lastName: e.last_name, dob: e.date_of_birth, photoUrl: e.image };
}

async function verifyme(nin) {
  const { data } = await axios.post(
    `https://vapi.verifyme.ng/v1/verifications/identities/nin/${nin}`,
    {},
    { headers: { Authorization: `Bearer ${process.env.VERIFYME_API_KEY}` }, timeout: 10_000 }
  );
  const d = data?.data;
  if (!d) return { ok: false, reason: 'Not found' };
  return { ok: true, firstName: d.firstname, lastName: d.lastname, dob: d.birthdate, photoUrl: d.photo };
}

async function youverify(nin) {
  const { data } = await axios.post(
    'https://api.youverify.co/v2/api/identity/ng/nin',
    { id: nin, isSubjectConsent: true },
    { headers: { token: process.env.YOUVERIFY_API_KEY }, timeout: 10_000 }
  );
  const d = data?.data;
  if (!d || data.statusCode >= 400) return { ok: false, reason: data?.message || 'Failed' };
  return { ok: true, firstName: d.firstName, lastName: d.lastName, dob: d.dateOfBirth, photoUrl: d.image };
}

async function smileid(nin) {
  const { data } = await axios.post(
    'https://api.smileidentity.com/v1/id_verification',
    { partner_id: process.env.SMILEID_PARTNER_ID, country: 'NG', id_type: 'NIN', id_number: nin },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10_000 }
  );
  if (data?.ResultCode !== '1012') return { ok: false, reason: data?.ResultText || 'Failed' };
  const [first, ...rest] = (data.FullName || '').split(' ');
  return { ok: true, firstName: first, lastName: rest.join(' '), dob: data.DOB, photoUrl: data.Photo };
}

async function mockProvider(nin) {
  if (!/^\d{11}$/.test(nin || '')) return { ok: false, reason: 'NIN must be 11 digits' };
  const ok = Number(nin.slice(-1)) % 2 === 0;
  return ok
    ? { ok: true, firstName: 'Test', lastName: 'User', dob: '1999-01-01', photoUrl: null }
    : { ok: false, reason: 'NIN not found in mock registry (use a NIN ending in an even digit)' };
}

const ADAPTERS = { dojah, verifyme, youverify, smileid, mock: mockProvider };

async function lookupNIN(nin) {
  if (!/^\d{11}$/.test(nin || '')) return { ok: false, reason: 'NIN must be 11 digits' };
  const provider = process.env.MOCK_THIRD_PARTY === 'true'
    ? 'mock'
    : (process.env.NIN_PROVIDER || 'mock');
  const fn = ADAPTERS[provider];
  if (!fn) return { ok: false, reason: `Unknown NIN provider: ${provider}` };
  try {
    return await fn(nin);
  } catch (e) {
    return { ok: false, reason: e.response?.data?.message || e.message };
  }
}

module.exports = { lookupNIN, stateFromNyscCode };
