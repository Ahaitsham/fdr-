const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const Notification = require('../models/Notification');
const HttpError = require('../utils/HttpError');
const { authenticate, requirePasswordSet } = require('../middleware/auth');

router.use(authenticate);
// Always scoped to the logged-in recipient.
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
  const q = { recipient: req.user._id };
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(q),
    Notification.countDocuments({ ...q, read: false }),
  ]);
  res.json({ success: true, data: items, unreadCount, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
router.post('/read-all', requirePasswordSet, async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });
  res.json({ success: true });
});
router.patch('/:id/read', requirePasswordSet, async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid id');
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { read: true, readAt: new Date() }, { new: true });
  if (!n) throw new HttpError(404, 'Notification not found');
  res.json({ success: true, data: n });
});
module.exports = router;
