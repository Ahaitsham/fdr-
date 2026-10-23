const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const { compute, addMonths, maturityInfo } = require('../src/utils/fdrCalc');
const { validateFdr } = require('../src/validators/fdr');

const good = { fdrNumber: 'DEMO-PNB-001025', receiptNumber: '672341', bankName: 'Punjab National Bank', bankBranch: 'Rohini, Delhi',
  depositorName: 'Global Tech Institute', customerId: 'C987654321', accountNumber: '190012345678', principal: '500000', interestRate: '6.25',
  tenureMonths: '12', issueDate: '2025-12-15', maturityDate: '2026-12-15', payoutFrequency: 'QUARTERLY' };

test('valid FDR (from the PNB sample) passes validation', () => assert.ok(validateFdr(good).data));
test('missing fields are reported individually', () => {
  const { errors } = validateFdr({});
  for (const k of ['fdrNumber', 'bankName', 'principal', 'issueDate', 'maturityDate', 'accountNumber']) assert.ok(errors[k], k);
  assert.match(errors.fdrNumber, /required/);
});
test('invalid amount and dates are rejected', () => {
  assert.ok(validateFdr({ ...good, principal: '-5' }).errors.principal);
  assert.ok(validateFdr({ ...good, principal: 'abc' }).errors.principal);
  assert.ok(validateFdr({ ...good, maturityDate: '2025-01-01' }).errors.maturityDate);
  assert.ok(validateFdr({ ...good, maturityDate: '2027-06-15' }).errors.maturityDate); // inconsistent with tenure
  assert.ok(validateFdr({ ...good, issueDate: '2025-02-31' }).errors.issueDate);
});
test('unknown fields (e.g. status, institution) are stripped', () => {
  const { data } = validateFdr({ ...good, status: 'APPROVED', institution: 'x' });
  assert.equal(data.status, undefined); assert.equal(data.institution, undefined);
});
test('quarterly payout schedule: 4 payments, principal returned at maturity', () => {
  const { data } = validateFdr(good);
  const c = compute(data);
  assert.equal(c.schedule.length, 4);
  assert.equal(c.schedule[0].amount, 7812.5);
  assert.equal(c.schedule[3].amount, 507812.5);
  assert.equal(c.totalInterest, 31250);
});
test('cumulative uses quarterly compounding', () => {
  const { data } = validateFdr({ ...good, payoutFrequency: 'CUMULATIVE' });
  const c = compute(data);
  assert.equal(c.schedule.length, 1);
  assert.ok(c.totalReturn > 531900 && c.totalReturn < 532100);
});
test('addMonths clamps month ends; maturity classification', () => {
  assert.equal(addMonths(new Date('2025-01-31'), 1).toISOString().slice(0, 10), '2025-02-28');
  assert.equal(maturityInfo(new Date('2000-01-01')).maturityStatus, 'EXPIRED');
  assert.equal(maturityInfo(new Date('2999-01-01')).maturityStatus, 'ACTIVE');
});
test('passwords are hashed with bcrypt', async () => {
  const h = await bcrypt.hash('Secret@123', 10);
  assert.notEqual(h, 'Secret@123'); assert.ok(await bcrypt.compare('Secret@123', h)); assert.ok(!(await bcrypt.compare('wrong', h)));
});
