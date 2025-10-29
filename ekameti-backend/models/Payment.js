const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Payment identification
  paymentId: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return 'PAY-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
  },
  
  // User information
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
  
  // Kameti information
  kametiId: {
    type: String, // Our unique kameti ID (KAMETI-ABC123)
    required: true
  },
  kametiName: {
    type: String,
    required: true
  },
  kametiMongoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kameti',
    required: true
  },
  
  // Payment details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'PKR'
  },
  paymentMethod: {
    type: String,
    enum: ['payfast', 'jazzcash', 'easypaisa', 'bank_transfer', 'demo'],
    required: true
  },
  
  // Transaction information
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  merchantTransactionId: {
    type: String // PayFast's transaction ID
  },
  
  // Payment status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  // Payment gateway response
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed, // Store full gateway response
    default: {}
  },
  
  // IPN/Webhook data
  ipnData: {
    type: mongoose.Schema.Types.Mixed, // Store full IPN data
    default: {}
  },
  
  // Timestamps
  paymentInitiatedAt: {
    type: Date,
    default: Date.now
  },
  paymentCompletedAt: {
    type: Date
  },
  
  // Additional metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    version: {
      type: String,
      default: '1.0'
    }
  },
  
  // Financial tracking
  fees: {
    gatewayFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    netAmount: {
      type: Number,
      default: function() {
        return this.amount - (this.fees?.gatewayFee || 0) - (this.fees?.platformFee || 0);
      }
    }
  },
  
  // Audit trail
  auditTrail: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    performedBy: String
  }]
}, { 
  timestamps: true,
  collection: 'payments'
});

// Indexes for better performance
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ kametiId: 1, createdAt: -1 });
// transactionId already has unique: true which creates an index
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ paymentCompletedAt: -1 });

// Virtual for payment duration
paymentSchema.virtual('paymentDuration').get(function() {
  if (this.paymentCompletedAt) {
    return this.paymentCompletedAt - this.paymentInitiatedAt;
  }
  return null;
});

// Method to add audit trail entry
paymentSchema.methods.addAuditEntry = function(action, details, performedBy = 'system') {
  this.auditTrail.push({
    action,
    details,
    performedBy,
    timestamp: new Date()
  });
  return this.save();
};

// Static method to get payment statistics
paymentSchema.statics.getPaymentStats = async function(userId = null, kametiId = null) {
  const matchStage = {};
  if (userId) matchStage.userId = userId;
  if (kametiId) matchStage.kametiId = kametiId;
  
  return await this.aggregate([
    { $match: matchStage },
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

module.exports = mongoose.model('Payment', paymentSchema);
