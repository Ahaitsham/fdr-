const nodemailer = require('nodemailer');
let transporter = null;
function get() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}
// Never throws: email problems must not break the main workflow. Never logs bodies.
async function sendMail(to, subject, text) {
  const t = get();
  if (!t) { console.log(`[mail:dev] SMTP not configured. Would send "${subject}" to ${to}`); return; }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h3 style="color:#1e3a8a">${subject}</h3><p>${text}</p><hr><small>AICTE FDR Management Portal (prototype)</small></div>`,
    });
  } catch (e) { console.error('[mail] send failed:', e.code || e.message); }
}
module.exports = { sendMail };
