const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendMail } = require('./mailer');

async function notifyUsers(userQuery, { type, title, message, fdr }) {
  try {
    const users = await User.find({ ...userQuery, active: true }).select('email');
    if (!users.length) return;
    await Notification.insertMany(users.map((u) => ({ recipient: u._id, fdr, type, title, message })));
    users.forEach((u) => sendMail(u.email, title, message));
  } catch (e) { console.error('[notify] failed:', e.message); }
}
const notifyOfficers = (p) => notifyUsers({ role: 'AICTE_OFFICER' }, p);
const notifyInstitution = (institutionId, p) => notifyUsers({ role: 'INSTITUTION', institution: institutionId }, p);
module.exports = { notifyOfficers, notifyInstitution };
