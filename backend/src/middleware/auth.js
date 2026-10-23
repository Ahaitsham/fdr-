const jwt = require('jsonwebtoken');
const User = require('../models/User');
const isProd = process.env.NODE_ENV === 'production';

// Cross-site (Vercel -> Railway) cookies need SameSite=None; Secure in production.
const cookieOptions = () => ({ httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' });
const setAuthCookie = (res, userId) => {
  const token = jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('token', token, { ...cookieOptions(), maxAge: 8 * 3600e3 });
};

async function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    const p = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(p.sub).populate('institution');
    if (!user || !user.active || (user.institution && !user.institution.active))
      return res.status(401).json({ success: false, message: 'Account is inactive or no longer exists' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' }); }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
const requirePasswordSet = (req, res, next) =>
  req.user.mustChangePassword
    ? res.status(403).json({ success: false, code: 'PASSWORD_CHANGE_REQUIRED', message: 'Please set a new password first' })
    : next();

module.exports = { authenticate, requireRole, requirePasswordSet, setAuthCookie, cookieOptions };
