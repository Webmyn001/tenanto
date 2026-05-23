// Nigerian phone: 0 or +234 or 234, then 7/8/9, then 9 digits = 11 total (0-prefix)
const PHONE_RE = /^(\+?234|0)[789]\d{9}$/;

// NYSC state code: 2 letters / 1-2 digits + letter / 3+ digits  e.g. OY/24A/1234
const STATECODE_RE = /^[A-Za-z]{2}\/\d{1,2}[A-Za-z]\/\d{3,}$/;

// NIN: exactly 11 digits
const NIN_RE = /^\d{11}$/;

export function validatePhone(v) {
  if (!v) return { ok: false, msg: 'Phone number is required' };
  if (!PHONE_RE.test(v.trim())) return { ok: false, msg: 'Enter a valid Nigerian number (e.g. 08031234567 or +2348031234567)' };
  return { ok: true, msg: '' };
}

export function validateStateCode(v) {
  if (!v) return { ok: false, msg: 'State code is required' };
  if (!STATECODE_RE.test(v.trim().toUpperCase())) return { ok: false, msg: 'Invalid format — use e.g. OY/24A/1234' };
  return { ok: true, msg: '' };
}

export function validateNIN(v) {
  if (!v) return { ok: false, msg: 'NIN is required' };
  if (!NIN_RE.test(v.trim())) return { ok: false, msg: 'NIN must be exactly 11 digits' };
  return { ok: true, msg: '' };
}

export function formatStateCode(v) {
  return v.toUpperCase().replace(/[^A-Z0-9/]/g, '');
}
