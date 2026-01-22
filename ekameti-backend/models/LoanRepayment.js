const mongoose = require('mongoose');

const loanRepaymentSchema = new mongoose.Schema({
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  dueDate: { type: Date, required: true },
  amountDue: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['due', 'paid', 'late'], default: 'due' },
  paidAt: { type: Date },
  txId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LoanRepayment', loanRepaymentSchema);











