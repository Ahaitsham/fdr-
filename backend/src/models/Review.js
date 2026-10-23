const { Schema, model } = require('mongoose');
// Append-only review history (never edited or deleted by the app).
module.exports = model('FDRReview', new Schema({
  fdr: { type: Schema.Types.ObjectId, ref: 'FDR', required: true, index: true },
  officer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  version: { type: Number, required: true },
  decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
  remarks: { type: String, trim: true, maxlength: 1000 },
  reviewedAt: { type: Date, default: Date.now, index: true },
}));
