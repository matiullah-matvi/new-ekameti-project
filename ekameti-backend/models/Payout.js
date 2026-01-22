const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  payoutId: {
    type: String,
    unique: true,
    required: true,
    default: () => 'PAYOUT-' + Math.random().toString(36).substr(2, 8).toUpperCase()
  },
  kametiId: { type: String, required: true, index: true },
  kametiMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kameti', required: true },
  kametiName: { type: String, required: true },
  round: { type: Number, required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmail: { type: String, required: true },
  recipientName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  method: {
    type: String,
    enum: ['manual', 'jazzcash', 'easypaisa', 'bank_transfer', 'auto'],
    default: 'manual'
  },
  transactionId: { type: String },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  confirmedAt: { type: Date },
  notes: { type: String },
  metadata: {
    selectionMethod: String
  }
}, {
  timestamps: true,
  collection: 'payouts'
});

payoutSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Payout || mongoose.model('Payout', payoutSchema);







