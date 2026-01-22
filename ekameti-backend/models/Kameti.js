const mongoose = require('mongoose');

const kametiSchema = new mongoose.Schema({
  // unique system ID
  kametiId: { 
    type: String, 
    unique: true, 
    required: true,
    default: function() {
      // Generate unique ID: KAMETI + random 8 characters
      return 'KAMETI-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }
  },
  
  // basic info
  name: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  
  // schedule and frequency
  contributionFrequency: { 
    type: String, 
    enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
    default: 'monthly'
  },
  startDate: { type: Date, required: true },
  
  // members and rounds
  membersCount: { type: Number, required: true },
  round: { type: String },
  // totalRounds removed: rounds are derived from membersCount (traditional kameti)
  currentRound: { type: Number, default: 1 },
  
  // payout settings
  payoutOrder: { 
    type: String, 
    enum: ['random', 'sequential', 'bidding', 'admin'],
    default: 'random'
  },
  
  // kameti settings
  isPrivate: { type: Boolean, default: false },
  autoReminders: { type: Boolean, default: true },
  latePaymentFee: { type: Number, default: 0 },
  
  // status
  status: { 
    type: String, 
    enum: ['Pending', 'Active', 'Completed', 'Closed', 'Cancelled'],
    default: 'Pending' 
  },

  // join requests - pending approvals from admin
  joinRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, required: true },
      name: { type: String },
      requestedAt: { type: Date, default: Date.now },
      status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      message: { type: String } // optional message from user
    }
  ],

  // members array with detailed tracking
  members: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String, required: true },
      name: { type: String },
      joinedAt: { type: Date, default: Date.now },
      paymentStatus: { type: String, default: 'unpaid' }, // 'paid' or 'unpaid'
      lastPaymentDate: { type: Date },
      transactionId: { type: String },
      contributionHistory: [{
        round: Number,
        amount: Number,
        paidAt: Date,
        status: String,
        transactionId: String,
        paymentMethod: String
      }],
      hasReceivedPayout: { type: Boolean, default: false },
      payoutRound: { type: Number }
    }
  ],

  // creator info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  
  // financial tracking
  totalCollected: { type: Number, default: 0 },
  totalDisbursed: { type: Number, default: 0 },

  // recent activities
  activities: [{
    type: {
      type: String,
      enum: ['payment', 'member_joined', 'member_left', 'dispute_raised', 'dispute_resolved', 'payout', 'round_completed'],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userEmail: { type: String },
    data: { type: mongoose.Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
  }],

  // delete request (for non-closed kametis - requires all members to agree)
  deleteRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date },
    reason: { type: String },
    memberApprovals: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: { type: String },
      name: { type: String },
      approved: { type: Boolean, default: false },
      approvedAt: { type: Date }
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Kameti', kametiSchema);
