// Client-side preview of returns (the server is the source of truth and recalculates on save).
export const addMonths = (iso: string, m: number) => {
  const d = new Date(iso + 'T00:00:00Z'); const day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + m);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d;
};
const FREQ: any = { MONTHLY: 1, QUARTERLY: 3, HALF_YEARLY: 6, ANNUAL: 12 };
export function preview(P: number, r: number, n: number, freq: string) {
  if (!(P > 0 && r > 0 && n > 0)) return null;
  if (!freq || freq === 'CUMULATIVE') { const A = P * Math.pow(1 + r / 400, (4 * n) / 12); return { totalInterest: A - P, totalReturn: A, payments: 1, each: A }; }
  const step = FREQ[freq]; const payments = Math.ceil(n / step);
  const totalInterest = (P * r / 100) * n / 12;
  return { totalInterest, totalReturn: P + totalInterest, payments, each: (P * r / 100) * step / 12 };
}
