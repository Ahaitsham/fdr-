const { compute, maturityInfo, todayIST } = require('./fdrCalc');

function present(f, detail = false) {
  const o = f.toObject ? f.toObject() : { ...f };
  const today = todayIST();
  const c = compute(o);
  const out = {
    ...o, id: String(o._id),
    totalInterest: c.totalInterest, totalReturn: c.totalReturn,
    ...maturityInfo(o.maturityDate, today),
    document: o.document?.storedName
      ? { originalName: o.document.originalName, mimeType: o.document.mimeType, size: o.document.size } : null,
  };
  delete out.__v;
  if (detail) out.schedule = c.schedule.map((e) => ({ ...e, received: o.status === 'APPROVED' && new Date(e.date) <= today }));
  return out;
}
module.exports = { present };
