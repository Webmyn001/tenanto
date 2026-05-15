/**
 * Email helper. Uses Brevo HTTP API to bypass port blocking on Render.
 */
const axios = require('axios');

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.SMTP_PASS; // Using the Brevo key from your .env
  const fromEmail = process.env.SMTP_USER; // Your verified Brevo email
  const fromName = "Tenanto";

  if (!apiKey || !fromEmail) {
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text || html}`);
    return { dev: true, logged: true };
  }

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html || text,
        textContent: text || html
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log(`[email:success] Message sent via Brevo API to ${to}:`, response.data.messageId);
    return response.data;
  } catch (err) {
    console.error(`[email:error] Brevo API failure for ${to}:`, err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendMail };
