const { z } = require('zod');
const { addMonths } = require('../utils/fdrCalc');

const text = (l, re, reMsg) => {
  let s = z.string({ required_error: `${l} is required`, invalid_type_error: `${l} is invalid` }).trim().min(1, `${l} is required`).max(120, `${l} is too long`);
  return re ? s.regex(re, reMsg) : s;
};
const num = (l, max) => z.preprocess(
  (v) => (v === '' || v == null ? undefined : Number(v)),
  z.number({ required_error: `${l} is required`, invalid_type_error: `${l} is invalid` }).positive(`${l} must be greater than 0`).max(max, `${l} is too large`));
const date = (l) => z.preprocess((v) => {
  if (v === '' || v == null) return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v);
  return isNaN(d) || d.toISOString().slice(0, 10) !== v ? null : d; // rejects impossible dates like 2025-02-31
}, z.date({ required_error: `${l} is required`, invalid_type_error: `${l} is invalid` }));

const fdrSchema = z.object({
  fdrNumber: text('FDR reference number', /^[A-Za-z0-9\-\/]{3,40}$/, 'FDR reference number may contain letters, numbers, - and / only'),
  receiptNumber: text('Receipt number', /^[A-Za-z0-9\-\/]{3,40}$/, 'Receipt number may contain letters, numbers, - and / only'),
  bankName: text('Bank name'),
  bankBranch: text('Bank branch'),
  depositorName: text('Depositor name'),
  customerId: text('Customer ID', /^[A-Za-z0-9\-]{3,30}$/, 'Customer ID may contain letters, numbers and - only'),
  accountNumber: text('Account number', /^\d{6,20}$/, 'Account number must be 6-20 digits'),
  principal: num('FDR amount', 1e11),
  interestRate: num('Interest rate', 20),
  tenureMonths: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)),
    z.number({ required_error: 'Tenure is required', invalid_type_error: 'Tenure is invalid' }).int('Tenure must be whole months').min(1, 'Tenure must be at least 1 month').max(120, 'Tenure cannot exceed 120 months')),
  issueDate: date('Issue date'),
  maturityDate: date('Maturity date'),
  payoutFrequency: z.preprocess((v) => (v === '' ? undefined : v),
    z.enum(['CUMULATIVE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'], { errorMap: () => ({ message: 'Interest payout option is invalid' }) }).default('CUMULATIVE')),
}).superRefine((d, ctx) => {
  if (d.maturityDate <= d.issueDate)
    return ctx.addIssue({ code: 'custom', path: ['maturityDate'], message: 'Maturity date must be after the issue date' });
  const exp = addMonths(d.issueDate, d.tenureMonths);
  if (Math.abs(exp - d.maturityDate) > 3 * 864e5)
    ctx.addIssue({ code: 'custom', path: ['maturityDate'], message: `Maturity date does not match the tenure (expected about ${exp.toISOString().slice(0, 10)})` });
});

/** Returns { data } or { errors: {field: message} } */
function validateFdr(body) {
  const r = fdrSchema.safeParse(body || {});
  if (r.success) return { data: r.data };
  const errors = {};
  for (const i of r.error.issues) { const k = i.path[0] || 'form'; if (!errors[k]) errors[k] = i.message; }
  return { errors };
}
module.exports = { validateFdr };
