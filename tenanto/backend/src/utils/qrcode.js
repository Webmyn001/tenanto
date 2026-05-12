const QRCode = require('qrcode');
const crypto = require('crypto');

function generateInspectionToken() {
  return crypto.randomBytes(24).toString('hex');
}

async function generateQRDataUrl(token) {
  // The QR encodes a URL the landlord opens in-app. Hitting that URL while
  // logged in as the listing's owner is what marks the inspection as completed.
  const base = process.env.CLIENT_URL || 'http://localhost:3000';
  const url = `${base}/inspections/scan/${token}`;
  return QRCode.toDataURL(url, { width: 320, margin: 1 });
}

module.exports = { generateInspectionToken, generateQRDataUrl };
