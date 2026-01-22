const mongoose = require('mongoose');

const loanPledgeSchema = new mongoose.Schema({
  loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  lenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'pledged', 'captured', 'refunded', 'transferred'],
    default: 'pending'
  },
  txId: { type: String }, // PayFast payment transaction id
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, // Reference to Payment record
  kametiId: { type: String }, // Lender's kameti ID - funds will be transferred from here when their turn comes
  kametiMongoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kameti' }, // Reference to lender's kameti
  transferredAt: { type: Date }, // When funds were transferred to borrower
  transferRound: { type: Number }, // Which round of kameti the transfer happened
}, { timestamps: true });

module.exports = mongoose.model('LoanPledge', loanPledgeSchema);

