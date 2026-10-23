const router = require('express').Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const User = require('../models/User');
const HttpError = require('../utils/HttpError');
const { authenticate, setAuthCookie, cookieOptions } = require('../middleware/auth');

const loginLimiter = rateLimit({ windowMs: 15 * 60e3, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again in a few minutes.' } });
const DUMMY = bcrypt.hashSync('dummy-password-for-timing', 10);

router.post('/login', loginLimiter, async (req, res) => {
  const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body || {});
  if (!p.success) throw new HttpError(400, 'Email and password are required');
  const user = await User.findOne({ email: p.data.email.toLowerCase() }).select('+passwordHash').populate('institution');
  const ok = await bcrypt.compare(p.data.password, user ? user.passwordHash : DUMMY);
  if (!user || !ok || !user.active || (user.institution && !user.institution.active))
    throw new HttpError(401, 'Invalid email or password, or the account is inactive');
  user.lastLoginAt = new Date();
  await user.save();
  setAuthCookie(res, user._id);
  res.json({ success: true, data: user });
});

router.get('/me', authenticate, (req, res) => res.json({ success: true, data: req.user }));

router.post('/logout', (req, res) => {
  res.clearCookie('token', cookieOptions());
  res.json({ success: true });
});

router.post('/change-password', authenticate, async (req, res) => {
  const p = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'New password needs a letter').regex(/\d/, 'New password needs a number'),
  }).safeParse(req.body || {});
  if (!p.success) throw new HttpError(400, p.error.issues[0].message);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(p.data.currentPassword, user.passwordHash))) throw new HttpError(400, 'Current password is incorrect');
  if (p.data.currentPassword === p.data.newPassword) throw new HttpError(400, 'New password must be different');
  user.passwordHash = await bcrypt.hash(p.data.newPassword, 12);
  user.mustChangePassword = false;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
});

module.exports = router;
