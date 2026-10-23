// Pure helpers: dates (UTC-midnight, IST "today") and return calculations.
const DAY = 864e5;
const FREQ = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, ANNUAL: 12 };
const round2 = (n) => Math.round(n * 100) / 100;

function addMonths(d, m) {
  const x = new Date(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + m);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return x;
}
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY);
function todayIST() {
  const n = new Date(Date.now() + 19800000);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * Returns schedule from stated terms only.
 * CUMULATIVE: interest compounded quarterly, paid at maturity.
 * MONTHLY/QUARTERLY/HALF_YEARLY/ANNUAL: simple interest paid out each period, principal at maturity.
 */
function compute(f) {
  const P = f.principal, r = f.interestRate, n = f.tenureMonths;
  let schedule = [];
  if (!f.payoutFrequency || f.payoutFrequency === 'CUMULATIVE') {
    const A = P * Math.pow(1 + r / 400, (4 * n) / 12);
    schedule = [{ date: f.maturityDate, type: 'MATURITY', interest: round2(A - P), principal: P, amount: round2(A) }];
  } else {
    const step = FREQ[f.payoutFrequency];
    const periods = [];
    let prev = 0;
    for (let m = step; m < n; m += step) { periods.push([prev, m]); prev = m; }
    periods.push([prev, n]);
    schedule = periods.map(([a, b], i) => {
      const last = i === periods.length - 1;
      const interest = round2((P * r / 100) * (b - a) / 12);
      return {
        date: last ? f.maturityDate : addMonths(f.issueDate, b),
        type: last ? 'MATURITY' : 'INTEREST',
        interest, principal: last ? P : 0, amount: round2(interest + (last ? P : 0)),
      };
    });
  }
  const totalInterest = round2(schedule.reduce((s, e) => s + e.interest, 0));
  return { schedule, totalInterest, totalReturn: round2(P + totalInterest) };
}

function maturityInfo(maturityDate, today = todayIST()) {
  const daysRemaining = Math.round((new Date(maturityDate) - today) / DAY);
  const maturityStatus = daysRemaining < 0 ? 'EXPIRED' : daysRemaining <= 60 ? 'DUE_SOON' : 'ACTIVE';
  return { daysRemaining, maturityStatus };
}

module.exports = { addMonths, addDays, todayIST, compute, maturityInfo, round2, FREQ };
