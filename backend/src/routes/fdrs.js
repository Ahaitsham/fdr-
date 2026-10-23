const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { isValidObjectId } = require('mongoose');
const FDR = require('../models/FDR');
const Review = require('../models/Review');
const HttpError = require('../utils/HttpError');
const { validateFdr } = require('../validators/fdr');
const { present } = require('../utils/present');
const { todayIST, addDays } = require('../utils/fdrCalc');
const { notifyOfficers, notifyInstitution } = require('../utils/notify');
const { authenticate, requireRole, requirePasswordSet } = require('../middleware/auth');

router.use(authenticate, requirePasswordSet);

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
// Detect the real type from file bytes (never trust client filename/MIME).
const SIGS = [
  { mime: 'application/pdf', ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'image/png', ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
];
const detect = (buf) => SIGS.find((s) => s.magic.every((b, i) => buf[i] === b));
const STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const FIELDS_MSG = 'Please fill in all required FDR details before submitting.';

function validateAll(req, docRequired) {
  const { data, errors } = validateFdr(req.body);
  const errs = { ...(errors || {}) };
  let sig = null;
  if (req.file) { sig = detect(req.file.buffer); if (!sig) errs.document = 'Only PDF, PNG or JPG documents are allowed'; }
  else if (docRequired) errs.document = 'FDR document is required';
  return { data, sig, errors: Object.keys(errs).length ? errs : null };
}
function storeDocument(file, sig) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const storedName = crypto.randomUUID() + sig.ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), file.buffer, { mode: 0o600 });
  return { originalName: path.basename(file.originalname || 'document').slice(0, 120), storedName, mimeType: sig.mime, size: file.size };
}
async function loadFdr(req) {
  if (!isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid FDR id');
  const q = { _id: req.params.id };
  if (req.user.role === 'INSTITUTION') q.institution = req.user.institution._id; // ownership enforced
  const f = await FDR.findOne(q).populate('institution', 'name code city state');
  if (!f) throw new HttpError(404, 'FDR not found');
  return f;
}

// ---------- list ----------
router.get('/', async (req, res) => {
  const { search, status, institution, maturity, expiryFrom, expiryTo, sort = 'createdAt', order = 'desc' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const q = {};
  if (req.user.role === 'INSTITUTION') q.institution = req.user.institution._id;
  else if (institution && isValidObjectId(String(institution))) q.institution = String(institution);
  if (search) q.fdrNumber = { $regex: esc(String(search).slice(0, 40)), $options: 'i' };
  if (STATUSES.includes(String(status))) q.status = String(status);
  const today = todayIST(); const md = {};
  if (maturity === 'EXPIRED') md.$lt = today;
  else if (maturity === 'DUE_SOON') { md.$gte = today; md.$lte = addDays(today, 60); }
  else if (maturity === 'ACTIVE') md.$gt = addDays(today, 60);
  else {
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(expiryFrom))) md.$gte = new Date(`${expiryFrom}T00:00:00Z`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(expiryTo))) md.$lte = new Date(`${expiryTo}T00:00:00Z`);
  }
  if (Object.keys(md).length) { q.maturityDate = md; if (maturity && !q.status) q.status = 'APPROVED'; }
  const sortField = { createdAt: 'createdAt', maturityDate: 'maturityDate', principal: 'principal', issueDate: 'issueDate', submittedAt: 'submittedAt' }[sort] || 'createdAt';
  const [items, total] = await Promise.all([
    FDR.find(q).populate('institution', 'name code').sort({ [sortField]: order === 'asc' ? 1 : -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    FDR.countDocuments(q),
  ]);
  res.json({ success: true, data: items.map((f) => present(f)), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

// ---------- create ----------
router.post('/', requireRole('INSTITUTION'), upload.single('document'), async (req, res) => {
  const { data, sig, errors } = validateAll(req, true);
  if (errors) return res.status(400).json({ success: false, message: FIELDS_MSG, errors });
  const fdr = await FDR.create({
    ...data, institution: req.user.institution._id, submittedBy: req.user._id,
    document: storeDocument(req.file, sig), status: 'PENDING_REVIEW', version: 1, submittedAt: new Date(),
    events: [{ type: 'SUBMITTED', version: 1, by: req.user._id }],
  });
  notifyOfficers({ type: 'FDR_SUBMITTED', fdr: fdr._id, title: 'New FDR submitted',
    message: `${req.user.institution.name} submitted FDR ${fdr.fdrNumber} for review.` });
  res.status(201).json({ success: true, data: present(fdr) });
});

// ---------- correct & resubmit a rejected FDR ----------
router.put('/:id', requireRole('INSTITUTION'), upload.single('document'), async (req, res) => {
  const current = await loadFdr(req);
  if (current.status !== 'REJECTED') throw new HttpError(409, 'Only rejected FDRs can be corrected and resubmitted');
  const { data, sig, errors } = validateAll(req, false);
  if (errors) return res.status(400).json({ success: false, message: FIELDS_MSG, errors });
  const $set = { ...data, status: 'PENDING_REVIEW', submittedAt: new Date(), rejectionReason: null, reviewedBy: null, reviewedAt: null };
  if (req.file) $set.document = storeDocument(req.file, sig);
  const updated = await FDR.findOneAndUpdate(
    { _id: current._id, institution: req.user.institution._id, status: 'REJECTED' },
    { $set, $inc: { version: 1 }, $push: { events: { type: 'RESUBMITTED', version: current.version + 1, at: new Date(), by: req.user._id } } },
    { new: true });
  if (!updated) throw new HttpError(409, 'This FDR was already resubmitted');
  notifyOfficers({ type: 'FDR_RESUBMITTED', fdr: updated._id, title: 'FDR resubmitted',
    message: `${req.user.institution.name} corrected and resubmitted FDR ${updated.fdrNumber}.` });
  res.json({ success: true, data: present(updated) });
});

// ---------- detail / document ----------
router.get('/:id', async (req, res) => {
  const f = await loadFdr(req);
  const reviews = await Review.find({ fdr: f._id }).sort({ reviewedAt: 1 }).populate('officer', 'name').lean();
  res.json({ success: true, data: { fdr: present(f, true), reviews } });
});

router.get('/:id/document', async (req, res) => {
  const f = await loadFdr(req);
  if (!f.document?.storedName) throw new HttpError(404, 'No document uploaded for this FDR');
  const file = path.join(UPLOAD_DIR, path.basename(f.document.storedName));
  if (!fs.existsSync(file)) throw new HttpError(404, 'Document file not found');
  res.setHeader('Content-Type', f.document.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${(f.document.originalName || 'fdr').replace(/[^\w.\-]/g, '_')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(file);
});

// ---------- review (officer) ----------
async function decide(req, res, decision) {
  if (!isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid FDR id');
  const remarks = String(req.body?.remarks || '').trim().slice(0, 1000);
  if (decision === 'REJECTED' && remarks.length < 5)
    return res.status(400).json({ success: false, message: 'Rejection remarks are required (min 5 characters)', errors: { remarks: 'Rejection remarks are required (min 5 characters)' } });
  // Atomic state transition: only a PENDING_REVIEW record can be reviewed, exactly once.
  const fdr = await FDR.findOneAndUpdate(
    { _id: req.params.id, status: 'PENDING_REVIEW' },
    { status: decision, reviewedBy: req.user._id, reviewedAt: new Date(), rejectionReason: decision === 'REJECTED' ? remarks : null },
    { new: true });
  if (!fdr) throw new HttpError(409, 'This FDR is not awaiting review (it may already have been reviewed).');
  await Review.create({ fdr: fdr._id, officer: req.user._id, version: fdr.version, decision, remarks });
  const ok = decision === 'APPROVED';
  notifyInstitution(fdr.institution, {
    type: ok ? 'FDR_APPROVED' : 'FDR_REJECTED', fdr: fdr._id,
    title: ok ? 'FDR approved' : 'FDR rejected - action required',
    message: ok ? `Your FDR ${fdr.fdrNumber} has been approved.` : `Your FDR ${fdr.fdrNumber} was rejected. Reason: ${remarks}`,
  });
  res.json({ success: true, data: present(fdr) });
}
router.post('/:id/approve', requireRole('AICTE_OFFICER'), (req, res) => decide(req, res, 'APPROVED'));
router.post('/:id/reject', requireRole('AICTE_OFFICER'), (req, res) => decide(req, res, 'REJECTED'));

module.exports = router;
