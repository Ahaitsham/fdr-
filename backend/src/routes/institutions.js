const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { isValidObjectId } = require('mongoose');
const Institution = require('../models/Institution');
const User = require('../models/User');
const FDR = require('../models/FDR');
const HttpError = require('../utils/HttpError');
const { sendMail } = require('../utils/mailer');
const { authenticate, requireRole, requirePasswordSet } = require('../middleware/auth');

router.use(authenticate, requirePasswordSet);

// Institution users can read only their own institution (used for profile / sidebar).
router.get('/me', requireRole('INSTITUTION'), (req, res) => res.json({ success: true, data: req.user.institution }));

router.use(requireRole('AICTE_OFFICER'));

const req_ = (l) => z.string({ required_error: `${l} is required` }).trim().min(1, `${l} is required`).max(200);
const optNum = (min, max, l) => z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)),
  z.number({ invalid_type_error: `${l} is invalid` }).min(min, `${l} is out of range`).max(max, `${l} is out of range`).optional());
const createSchema = z.object({
  name: req_('Institution name'),
  code: req_('Institution code').regex(/^[A-Za-z0-9\-]{3,20}$/, 'Code must be 3-20 letters, numbers or -'),
  email: z.string({ required_error: 'Official email is required' }).trim().toLowerCase().email('Official email is invalid'),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Phone number is invalid').optional().or(z.literal('')),
  address: req_('Address'), city: req_('City'), state: req_('State'),
  postalCode: z.string({ required_error: 'Postal code is required' }).trim().regex(/^\d{6}$/, 'Postal code must be 6 digits'),
  latitude: optNum(-90, 90, 'Latitude'), longitude: optNum(-180, 180, 'Longitude'),
});

router.get('/', async (req, res) => {
  const [insts, counts, users] = await Promise.all([
    Institution.find().sort({ createdAt: -1 }).lean(),
    FDR.aggregate([{ $group: { _id: { i: '$institution', s: '$status' }, n: { $sum: 1 } } }]),
    User.find({ role: 'INSTITUTION' }).select('institution lastLoginAt mustChangePassword').lean(),
  ]);
  const data = insts.map((i) => {
    const c = { total: 0, pending: 0, approved: 0, rejected: 0 };
    counts.filter((x) => String(x._id.i) === String(i._id)).forEach((x) => {
      c.total += x.n;
      if (x._id.s === 'PENDING_REVIEW') c.pending = x.n; if (x._id.s === 'APPROVED') c.approved = x.n; if (x._id.s === 'REJECTED') c.rejected = x.n;
    });
    const u = users.find((x) => String(x.institution) === String(i._id));
    return { ...i, id: String(i._id), fdrCounts: c, lastLoginAt: u?.lastLoginAt, passwordSetupPending: !!u?.mustChangePassword };
  });
  res.json({ success: true, data });
});

router.post('/', async (req, res) => {
  const p = createSchema.safeParse(req.body || {});
  if (!p.success) {
    const errors = {};
    p.error.issues.forEach((i) => { if (!errors[i.path[0]]) errors[i.path[0]] = i.message; });
    return res.status(400).json({ success: false, message: 'Please correct the highlighted fields', errors });
  }
  const d = p.data;
  if (await User.exists({ email: d.email })) throw new HttpError(409, 'An account with this email already exists', { email: 'Email already in use' });
  if (await Institution.exists({ code: d.code.toUpperCase() })) throw new HttpError(409, 'Institution code already exists', { code: 'Code already in use' });

  const institution = await Institution.create(d);
  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  try {
    await User.create({
      name: d.contactPerson || d.name, email: d.email, role: 'INSTITUTION', institution: institution._id,
      passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true,
    });
  } catch (e) { await Institution.deleteOne({ _id: institution._id }); throw e; }

  // Invitation email never contains the password; the officer hands over the one-time credential.
  sendMail(d.email, 'Your AICTE FDR Portal account is ready',
    `An account for ${d.name} has been created on the AICTE FDR Management Portal. Your AICTE officer will share your one-time temporary password separately. You will be asked to set a new password at first login.`);
  // temporaryPassword is returned exactly once, here, and never stored in plaintext.
  res.status(201).json({ success: true, data: { institution, temporaryPassword } });
});

router.patch('/:id/status', async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid id');
  const p = z.object({ active: z.boolean() }).safeParse(req.body || {});
  if (!p.success) throw new HttpError(400, 'active (true/false) is required');
  const inst = await Institution.findByIdAndUpdate(req.params.id, { active: p.data.active }, { new: true });
  if (!inst) throw new HttpError(404, 'Institution not found');
  await User.updateMany({ institution: inst._id }, { active: p.data.active });
  res.json({ success: true, data: inst });
});

module.exports = router;
