const crypto = require('crypto');

/**
 * AES-256-CBC encryption for fields-at-rest.
 * Key derivation: scrypt(JWT_SECRET, fixed salt) — replace `ENCRYPTION_KEY` env
 * with a real 32-byte key in production. Stored values are `iv:ciphertext` (hex).
 */

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-only-fallback-secret';
  return crypto.scryptSync(secret, 'tenanto-salt-v1', 32);
}

function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + enc.toString('hex');
}

function decrypt(payload) {
  if (!payload) return null;
  try {
    const [ivHex, ctHex] = payload.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKey(), Buffer.from(ivHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

// Deterministic hash for lookups / uniqueness, since ciphertext changes per encrypt
function hashForLookup(plaintext) {
  if (plaintext == null) return null;
  return crypto.createHmac('sha256', getKey()).update(String(plaintext)).digest('hex');
}

module.exports = { encrypt, decrypt, hashForLookup };
