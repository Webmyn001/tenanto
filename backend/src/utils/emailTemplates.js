function emailLayout({ title, body, code }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f2eb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2eb;padding:24px 16px">
<tr><td align="center">
<table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px">
<span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#0f635c">Tenanto</span>
</td></tr>
<tr><td style="background-color:#ffffff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;text-align:center">${title}</h1>
<p style="font-size:14px;line-height:1.6;color:#6b7280;text-align:center;margin:0 0 24px">${body}</p>
<div style="background-color:#f0fdfa;border:2px solid #0f635c;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
<span style="font-family:Inter,-apple-system,monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#0f635c">${code}</span>
</div>
<p style="font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;margin:0">If you didn't request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="text-align:center;padding-top:20px">
<p style="font-size:11px;color:#9ca3af;margin:0 0 4px">Tenanto — Agent-free verified housing marketplace</p>
<p style="font-size:11px;color:#d1d5db;margin:0">&copy; ${new Date().getFullYear()} Tenanto. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function verifyEmail({ code }) {
  return emailLayout({
    title: 'Welcome to Tenanto!',
    body: 'Thanks for signing up. Please verify your email address using the code below. This code expires in <b>5 minutes</b>.',
    code,
  });
}

function verifyEmailResend({ code }) {
  return emailLayout({
    title: 'Verify your email',
    body: 'Here is your new email verification code. This code expires in <b>5 minutes</b>.',
    code,
  });
}

function resetPassword({ code }) {
  return emailLayout({
    title: 'Reset your password',
    body: 'You requested a password reset. Use the code below to set a new password. This code expires in <b>5 minutes</b>.',
    code,
  });
}

function schoolEmailVerification({ code, schoolEmail }) {
  return emailLayout({
    title: 'Verify your school email',
    body: `Use the code below to verify <b>${schoolEmail}</b> as your school email address. This code expires in <b>5 minutes</b>.`,
    code,
  });
}

function verificationApproved({ fullName }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f2eb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2eb;padding:24px 16px">
<tr><td align="center">
<table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px">
<span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#0f635c">Tenanto</span>
</td></tr>
<tr><td style="background-color:#ffffff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;text-align:center">Verification Approved ✅</h1>
<p style="font-size:14px;line-height:1.6;color:#6b7280;text-align:center;margin:0 0 24px">Hi <b>${fullName}</b>, your account has been verified and approved by our admin team. You now have full access to all features on Tenanto.</p>
<div style="text-align:center;margin-bottom:24px">
<a href="https://tenanto.onrender.com/login" style="display:inline-block;background-color:#0f635c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">Sign in to Tenanto</a>
</div>
<p style="font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;margin:0">If you have any questions, reply to this email.</p>
</td></tr>
<tr><td style="text-align:center;padding-top:20px">
<p style="font-size:11px;color:#9ca3af;margin:0 0 4px">Tenanto — Agent-free verified housing marketplace</p>
<p style="font-size:11px;color:#d1d5db;margin:0">&copy; ${new Date().getFullYear()} Tenanto. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function verificationRejected({ fullName, notes }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f2eb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2eb;padding:24px 16px">
<tr><td align="center">
<table width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:24px">
<span style="font-family:'Playfair Display',Georgia,serif;font-size:26px;font-weight:700;color:#0f635c">Tenanto</span>
</td></tr>
<tr><td style="background-color:#ffffff;border-radius:16px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
<h1 style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 8px;text-align:center">Verification Update</h1>
<p style="font-size:14px;line-height:1.6;color:#6b7280;text-align:center;margin:0 0 16px">Hi <b>${fullName}</b>, your verification could not be approved at this time.</p>
${notes ? `<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px"><p style="font-size:13px;color:#991b1b;margin:0;text-align:center"><b>Reason:</b> ${notes}</p></div>` : ''}
<p style="font-size:14px;line-height:1.6;color:#6b7280;text-align:center;margin:0 0 24px">You can log in and restart the verification process with corrected information.</p>
<div style="text-align:center;margin-bottom:24px">
<a href="https://tenanto.onrender.com/verify" style="display:inline-block;background-color:#0f635c;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px">Restart Verification</a>
</div>
<p style="font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;margin:0">If you have any questions, reply to this email.</p>
</td></tr>
<tr><td style="text-align:center;padding-top:20px">
<p style="font-size:11px;color:#9ca3af;margin:0 0 4px">Tenanto — Agent-free verified housing marketplace</p>
<p style="font-size:11px;color:#d1d5db;margin:0">&copy; ${new Date().getFullYear()} Tenanto. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

module.exports = { verifyEmail, verifyEmailResend, resetPassword, schoolEmailVerification, verificationApproved, verificationRejected };
