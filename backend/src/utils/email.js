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
    console.log('[email] SMTP_HOST not set, using console fallback');
    transporter = false;
    return false;
  }
  
  const config = {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  };

  transporter = nodemailer.createTransport(config);
  
  // Verify connection configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('[email:error] SMTP Connection Error:', error.message);
    } else {
      console.log('[email:success] SMTP Server is ready to take our messages');
    }
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
  try {
    const info = await t.sendMail({ from, to, subject, text, html });
    console.log(`[email:success] Message sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[email:error] Failed to send email to ${to}:`, err.message);
    if (err.code === 'EAUTH') {
      console.error('[email:error] Authentication failed. Check your SMTP_USER and SMTP_PASS.');
    }
    throw err;
  }
}

module.exports = { sendMail };
