const mongoose = require('mongoose');

const loanRequestSchema = new mongoose.Schema({
  borrowerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kametiId: { type: String, required: true }, // Kameti ID - loan is internal to this kameti
  kametiMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kameti', required: true }, // Reference to kameti
  amount: { type: Number, required: true },
  targetAmount: { type: Number }, // optional if different from amount
  termMonths: { type: Number, required: true },
  interestRate: { type: Number, default: 0 },
  purpose: { type: String, required: true, maxlength: 500 },
  status: {
    type: String,
    enum: ['open', 'funded', 'active', 'repaying', 'completed', 'defaulted', 'cancelled'],
    default: 'open'
  },
  fundedAmount: { type: Number, default: 0 },
  riskScore: { type: Number, default: null },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical', null], default: null },
  scheduleType: { type: String, enum: ['amortized', 'bullet'], default: 'amortized' },
  activationDate: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model('LoanRequest', loanRequestSchema);

