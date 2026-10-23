const { Schema, model } = require('mongoose');
const s = new Schema({
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fdr: { type: Schema.Types.ObjectId, ref: 'FDR' },
  type: { type: String, enum: ['FDR_SUBMITTED', 'FDR_APPROVED', 'FDR_REJECTED', 'FDR_RESUBMITTED', 'FDR_EXPIRING', 'FDR_EXPIRED', 'INSTITUTION_CREATED'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });
s.index({ recipient: 1, read: 1, createdAt: -1 });
module.exports = model('Notification', s);
