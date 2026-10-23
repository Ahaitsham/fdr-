const { Schema, model } = require('mongoose');
const s = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['INSTITUTION', 'AICTE_OFFICER'], required: true },
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', index: true },
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  lastLoginAt: Date,
}, { timestamps: true });
s.set('toJSON', { transform: (d, r) => { delete r.passwordHash; delete r.__v; return r; } });
module.exports = model('User', s);
