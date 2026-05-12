/**
 * Email helper. If SMTP_HOST is set, uses nodemailer SMTP. Otherwise falls
 * back to console.log in dev. Ship a real provider (Postmark, Mailgun, Resend,
 * SES) by setting SMTP_* env vars.
 */
let nodemailer;
try { nodemailer = require('nodemailer'); } catch { nodemailer = null; }

let transporter = null;
function getTransporter() {
  if (transporter !== null) return transporter;
  if (!nodemailer || !process.env.SMTP_HOST) {
    transporter = false; // explicitly disabled
    return false;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { dev: true, logged: true };
  }
  const from = process.env.SMTP_FROM || 'Tenanto <noreply@tenanto.local>';
  return t.sendMail({ from, to, subject, text, html });
}

module.exports = { sendMail };
