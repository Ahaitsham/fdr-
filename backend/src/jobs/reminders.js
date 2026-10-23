// Runs inside the API process (every 6h + shortly after boot). Dedup: each FDR is claimed atomically
// by setting expiryReminderSentAt / expiredNotifiedAt only if still null, so restarts never double-send.
const FDR = require('../models/FDR');
const { todayIST, addDays } = require('../utils/fdrCalc');
const { notifyOfficers, notifyInstitution } = require('../utils/notify');

async function runReminders() {
  const today = todayIST();
  const soon = await FDR.find({ status: 'APPROVED', expiryReminderSentAt: null, maturityDate: { $gte: today, $lte: addDays(today, 30) } }).select('_id');
  for (const { _id } of soon) {
    const f = await FDR.findOneAndUpdate({ _id, expiryReminderSentAt: null }, { expiryReminderSentAt: new Date() }, { new: true });
    if (!f) continue;
    const msg = `FDR ${f.fdrNumber} matures on ${f.maturityDate.toISOString().slice(0, 10)}. Please plan renewal or redemption.`;
    await notifyInstitution(f.institution, { type: 'FDR_EXPIRING', fdr: f._id, title: 'FDR maturing soon', message: msg });
    await notifyOfficers({ type: 'FDR_EXPIRING', fdr: f._id, title: 'FDR maturing soon', message: msg });
  }
  const expired = await FDR.find({ status: 'APPROVED', expiredNotifiedAt: null, maturityDate: { $lt: today } }).select('_id');
  for (const { _id } of expired) {
    const f = await FDR.findOneAndUpdate({ _id, expiredNotifiedAt: null }, { expiredNotifiedAt: new Date() }, { new: true });
    if (!f) continue;
    const msg = `FDR ${f.fdrNumber} has matured. Please record its renewal or redemption.`;
    await notifyInstitution(f.institution, { type: 'FDR_EXPIRED', fdr: f._id, title: 'FDR matured', message: msg });
    await notifyOfficers({ type: 'FDR_EXPIRED', fdr: f._id, title: 'FDR matured', message: msg });
  }
  console.log(`[reminders] checked: ${soon.length} expiring, ${expired.length} expired`);
}
function startReminders() {
  if (process.env.REMINDERS_ENABLED === 'false') return;
  const run = () => runReminders().catch((e) => console.error('[reminders] failed:', e.message));
  setTimeout(run, 10000);
  setInterval(run, 6 * 3600e3);
}
module.exports = { runReminders, startReminders };
