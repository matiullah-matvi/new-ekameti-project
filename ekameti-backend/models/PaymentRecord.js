const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  // Kameti and member identification
  kametiId: {
    type: String, // Our unique kameti ID (KAMETI-ABC123)
    required: true
  },
  kametiMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kameti',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  
  // Payment round information
  round: {
    type: Number,
    required: true
  },
  totalRounds: {
    type: Number,
    required: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['payfast', 'jazzcash', 'easypaisa', 'bank_transfer', 'demo'],
    required: true
  },
  
  // Transaction information
  transactionId: {
    type: String,
    required: true
  },
  paymentId: {
    type: String, // Reference to Payment model
    required: true
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  
  // Due date and payment dates
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date
  },
  
  // Late payment tracking
  isLate: {
    type: Boolean,
    default: false
  },
  lateFee: {
    type: Number,
    default: 0
  },
  daysLate: {
    type: Number,
    default: 0
  },
  
  // Payment verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  verificationNotes: {
    type: String
  },
  
  // Additional metadata
  metadata: {
    paymentGatewayResponse: mongoose.Schema.Types.Mixed,
    ipnData: mongoose.Schema.Types.Mixed,
    userAgent: String,
    ipAddress: String
  }
}, { 
  timestamps: true,
  collection: 'payment_records'
});

// Indexes for better performance
paymentRecordSchema.index({ kametiId: 1, userId: 1, round: 1 });
paymentRecordSchema.index({ userId: 1, createdAt: -1 });
paymentRecordSchema.index({ kametiId: 1, round: 1 });
paymentRecordSchema.index({ status: 1 });
paymentRecordSchema.index({ dueDate: 1 });
paymentRecordSchema.index({ paidAt: -1 });

// Virtual for payment status
paymentRecordSchema.virtual('isOverdue').get(function() {
  if (this.status === 'paid') return false;
  return new Date() > this.dueDate;
});

// Method to mark as paid
paymentRecordSchema.methods.markAsPaid = function(paymentId, transactionId, paymentMethod, metadata = {}) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.paymentId = paymentId;
  this.transactionId = transactionId;
  this.paymentMethod = paymentMethod;
  this.metadata = { ...this.metadata, ...metadata };
  
  // Calculate if it was late
  if (this.paidAt > this.dueDate) {
    this.isLate = true;
    this.daysLate = Math.ceil((this.paidAt - this.dueDate) / (1000 * 60 * 60 * 24));
  }
  
  return this.save();
};

// Static method to get payment summary for a user
paymentRecordSchema.statics.getUserPaymentSummary = async function(userId) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get overdue payments
paymentRecordSchema.statics.getOverduePayments = async function(kametiId = null) {
  const matchStage = {
    status: { $in: ['pending'] },
    dueDate: { $lt: new Date() }
  };
  
  if (kametiId) matchStage.kametiId = kametiId;
  
  return await this.find(matchStage).populate('userId', 'fullName email phone');
};

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
