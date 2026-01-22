const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  // Unique Case ID
  caseId: {
    type: String,
    required: true,
    default: function() {
      return 'CASE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    }
  },

  // User who raised the dispute
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },

  // Related Kameti and Payment
  kametiId: {
    type: String, // Our unique kameti ID (KAMETI-ABC123)
    required: true
  },
  kametiMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kameti',
    required: true
  },
  kametiName: {
    type: String,
    required: true
  },

  // Payment record reference (if dispute is about a payment)
  paymentRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentRecord'
  },
  paymentId: {
    type: String // Reference to Payment model
  },
  transactionId: {
    type: String
  },

  // Dispute details
  reason: {
    type: String,
    enum: [
      'payment_not_recorded',
      'incorrect_amount',
      'duplicate_payment',
      'refund_request',
      'late_fee_dispute',
      'interest_dispute',
      'payout_issue',
      'member_issue',
      'other'
    ],
    required: true
  },
  reasonLabel: {
    type: String, // Human-readable label
    required: true
  },
  explanation: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 2000
  },

  // Proof/Evidence
  proof: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Status tracking
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'rejected', 'closed'],
    default: 'open'
  },

  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },

  // Resolution
  resolution: {
    type: String,
    enum: ['approved', 'rejected', 'pending']
  },
  resolutionType: {
    type: String,
    enum: ['refund', 'penalty', 'adjustment', 'no_action', 'other']
  },
  resolutionAmount: {
    type: Number,
    default: 0
  },
  resolutionNotes: {
    type: String,
    maxlength: 1000
  },
  resolvedAt: {
    type: Date
  },

  // Priority (admin can set)
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Additional metadata
  metadata: {
    paymentLogs: mongoose.Schema.Types.Mixed,
    userHistory: mongoose.Schema.Types.Mixed,
    evidenceReviewed: { type: Boolean, default: false }
  }
}, { 
  timestamps: true,
  collection: 'disputes'
});

// Indexes for better performance
disputeSchema.index({ userId: 1, createdAt: -1 });
disputeSchema.index({ kametiId: 1, status: 1 });
disputeSchema.index({ caseId: 1 });
disputeSchema.index({ status: 1, priority: 1 });
disputeSchema.index({ paymentRecordId: 1 });

// Virtual for days open
disputeSchema.virtual('daysOpen').get(function() {
  if (this.status === 'closed' || this.status === 'resolved') {
    return Math.ceil((this.resolvedAt - this.createdAt) / (1000 * 60 * 60 * 24));
  }
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to mark as under review
disputeSchema.methods.markUnderReview = function(adminId) {
  this.status = 'under_review';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  return this.save();
};

// Method to resolve dispute
disputeSchema.methods.resolve = function(resolution, resolutionType, amount, notes, adminId) {
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolutionType = resolutionType;
  this.resolutionAmount = amount || 0;
  this.resolutionNotes = notes;
  this.resolvedAt = new Date();
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  return this.save();
};

// Method to reject dispute
disputeSchema.methods.reject = function(notes, adminId) {
  this.status = 'rejected';
  this.resolution = 'rejected';
  this.resolutionNotes = notes;
  this.resolvedAt = new Date();
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  return this.save();
};

// Static method to get disputes by status
disputeSchema.statics.getByStatus = async function(status) {
  return await this.find({ status }).populate('userId', 'fullName email').populate('kametiMongoId', 'name').sort({ createdAt: -1 }).lean();
};

// Static method to get user disputes
disputeSchema.statics.getUserDisputes = async function(userId) {
  return await this.find({ userId }).populate('kametiMongoId', 'name').sort({ createdAt: -1 }).lean();
};

module.exports = mongoose.model('Dispute', disputeSchema);

