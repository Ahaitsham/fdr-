const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const FDR = require('../models/FDR');
const Review = require('../models/Review');
const Institution = require('../models/Institution');
const HttpError = require('../utils/HttpError');
const { compute, todayIST, addMonths } = require('../utils/fdrCalc');
const { present } = require('../utils/present');
const { authenticate, requirePasswordSet } = require('../middleware/auth');

router.use(authenticate, requirePasswordSet);
const scope = (req) => req.user.role === 'INSTITUTION'
  ? { institution: req.user.institution._id }
  : (req.query.institution && isValidObjectId(String(req.query.institution)) ? { institution: String(req.query.institution) } : {});
const IST = 19800000;
const dayKey = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);

// ---------- dashboard summary (all values computed from the database) ----------
router.get('/summary', async (req, res) => {
  const officer = req.user.role === 'AICTE_OFFICER';
  const fdrs = await FDR.find(scope(req)).populate('institution', 'name code').limit(5000).lean();
  const today = todayIST();
  const approved = fdrs.filter((f) => f.status === 'APPROVED');
  const days = (f) => Math.round((new Date(f.maturityDate) - today) / 864e5);
  const counts = {
    total: fdrs.length,
    pending: fdrs.filter((f) => f.status === 'PENDING_REVIEW').length,
    approved: approved.length,
    rejected: fdrs.filter((f) => f.status === 'REJECTED').length,
    dueSoon: approved.filter((f) => days(f) >= 0 && days(f) <= 60).length,
    expired: approved.filter((f) => days(f) < 0).length,
  };
  let received = 0, pending = 0, totalReturn = 0, principal = 0;
  const upcoming = [];
  approved.forEach((f) => {
    const c = compute(f);
    principal += f.principal; totalReturn += c.totalReturn;
    c.schedule.forEach((e) => {
      if (new Date(e.date) <= today) received += e.amount;
      else { pending += e.amount; upcoming.push({ fdrId: String(f._id), fdrNumber: f.fdrNumber, institution: f.institution?.name, date: e.date, type: e.type, amount: e.amount }); }
    });
  });
  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
  const byInst = {};
  fdrs.filter((f) => f.status === 'PENDING_REVIEW').forEach((f) => { const k = f.institution?.name; byInst[k] = (byInst[k] || 0) + 1; });
  const ids = fdrs.map((f) => f._id);
  const reviews = await Review.find({ fdr: { $in: ids } }).sort({ reviewedAt: -1 }).limit(5).populate('fdr', 'fdrNumber').populate('officer', 'name').lean();
  res.json({ success: true, data: {
    counts: { ...counts, institutions: officer ? await Institution.countDocuments() : undefined },
    amounts: { principal, totalReturn: Math.round(totalReturn * 100) / 100, returnsReceived: Math.round(received * 100) / 100, returnsPending: Math.round(pending * 100) / 100 },
    statusData: [
      { name: 'Approved', value: counts.approved }, { name: 'Pending review', value: counts.pending }, { name: 'Rejected', value: counts.rejected },
    ],
    recent: [...fdrs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5).map((f) => present(f)),
    attention: fdrs.filter((f) => f.status === (officer ? 'PENDING_REVIEW' : 'REJECTED')).slice(0, 5).map((f) => present(f)),
    upcomingReturns: upcoming.slice(0, 6),
    recentReviews: reviews,
    institutionsAttention: Object.entries(byInst).map(([name, pending]) => ({ name, pending })).sort((a, b) => b.pending - a.pending).slice(0, 5),
  } });
});

// ---------- date-range charts ----------
router.get('/charts', async (req, res) => {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const todayStr = dayKey(new Date());
  const from = re.test(String(req.query.from)) ? String(req.query.from) : dayKey(Date.now() - 29 * 864e5);
  const to = re.test(String(req.query.to)) ? String(req.query.to) : todayStr;
  // Inclusive IST day boundaries
  const start = new Date(`${from}T00:00:00+05:30`), end = new Date(`${to}T23:59:59.999+05:30`);
  if (isNaN(start) || isNaN(end) || start > end) throw new HttpError(400, 'Invalid date range');
  const spanDays = Math.round((end - start) / 864e5);
  if (spanDays > 731) throw new HttpError(400, 'Date range cannot exceed 2 years');
  const monthly = spanDays > 92;
  const key = (d) => (monthly ? dayKey(d).slice(0, 7) : dayKey(d));
  const buckets = {};
  for (let t = start.getTime(); t <= end.getTime(); t += 864e5) { const k = key(t); if (!buckets[k]) buckets[k] = { label: k, submissions: 0, approved: 0, rejected: 0 }; }
  const sc = scope(req);
  const fdrs = await FDR.find(sc).populate('institution', 'name').limit(5000).lean();
  const inRange = (d) => d >= start && d <= end;
  fdrs.forEach((f) => (f.events || []).forEach((e) => { if (inRange(new Date(e.at))) { const b = buckets[key(e.at)]; if (b) b.submissions++; } }));
  const reviews = await Review.find({ fdr: { $in: fdrs.map((f) => f._id) }, reviewedAt: { $gte: start, $lte: end } }).lean();
  reviews.forEach((r) => { const b = buckets[key(r.reviewedAt)]; if (b) (r.decision === 'APPROVED' ? b.approved++ : b.rejected++); });

  const ranged = fdrs.filter((f) => inRange(new Date(f.createdAt)));
  const statusData = ['APPROVED', 'PENDING_REVIEW', 'REJECTED'].map((s) => ({ name: s === 'PENDING_REVIEW' ? 'Pending review' : s[0] + s.slice(1).toLowerCase(), value: ranged.filter((f) => f.status === s).length }));

  // Forward-looking: approved FDRs maturing over the next 12 months (not limited by the range).
  const now = todayIST();
  const m0 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const maturities = Array.from({ length: 12 }, (_, i) => { const d = addMonths(m0, i); return { label: d.toISOString().slice(0, 7), count: 0, amount: 0 }; });
  fdrs.filter((f) => f.status === 'APPROVED').forEach((f) => {
    const m = maturities.find((x) => x.label === new Date(f.maturityDate).toISOString().slice(0, 7));
    if (m) { m.count++; m.amount += compute(f).totalReturn; }
  });
  const instMap = {};
  if (req.user.role === 'AICTE_OFFICER') ranged.forEach((f) => { const n = f.institution?.name || 'Unknown'; instMap[n] = instMap[n] || { name: n, count: 0, principal: 0 }; instMap[n].count++; instMap[n].principal += f.principal; });
  res.json({ success: true, data: {
    range: { from, to, bucket: monthly ? 'month' : 'day' },
    timeline: Object.values(buckets).sort((a, b) => a.label.localeCompare(b.label)),
    statusData, maturities: maturities.map((m) => ({ ...m, amount: Math.round(m.amount) })),
    institutions: Object.values(instMap).sort((a, b) => b.count - a.count).slice(0, 10),
  } });
});
module.exports = router;
