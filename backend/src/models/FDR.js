const { Schema, model } = require('mongoose');
const s = new Schema({
  institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  // Fields taken from the Fixed Deposit Receipt (PNB sample)
  fdrNumber: { type: String, required: true, trim: true },
  receiptNumber: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  bankBranch: { type: String, required: true, trim: true },
  depositorName: { type: String, required: true, trim: true },
  customerId: { type: String, required: true, trim: true },
  accountNumber: { type: String, required: true, trim: true },
  principal: { type: Number, required: true, min: 1 },
  interestRate: { type: Number, required: true, min: 0.01, max: 20 },
  tenureMonths: { type: Number, required: true, min: 1, max: 120 },
  issueDate: { type: Date, required: true },
  maturityDate: { type: Date, required: true },
  payoutFrequency: { type: String, enum: ['CUMULATIVE', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL'], default: 'CUMULATIVE' },
  document: { originalName: String, storedName: String, mimeType: String, size: Number },
  status: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'], default: 'PENDING_REVIEW', index: true },
  version: { type: Number, default: 1 },
  submittedAt: Date,
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: String,
  events: [{ _id: false, type: { type: String, enum: ['SUBMITTED', 'RESUBMITTED'] }, version: Number, at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: 'User' } }],
  expiryReminderSentAt: Date,
  expiredNotifiedAt: Date,
}, { timestamps: true });
s.index({ institution: 1, fdrNumber: 1 }, { unique: true });
s.index({ status: 1, submittedAt: -1 });
s.index({ maturityDate: 1 });
module.exports = model('FDR', s);
