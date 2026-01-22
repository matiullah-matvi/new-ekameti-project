const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String }, // Optional (not required for OTP flow)
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for Google OAuth users
  phone: { type: String }, // Optional for Google OAuth users

  // Google OAuth fields
  googleId: { type: String, unique: true, sparse: true },
  profilePhoto: { type: String },

  // Optional fields
  cnic: { type: String },
  cnicConfirm: { type: String },
  cardNumber: { type: String },
  cvv: { type: String },
  expiry: { type: String },
  cnicImage: { type: String },

  // ✅ Reference to the Kameti group the user joined
  kametiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kameti',
  },

  // ✅ Array of Kametis the user has joined
  joinedKametis: [{
    kametiId: { type: String, required: true }, // Our custom Kameti ID
    kametiName: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, default: 'member' }, // 'member', 'admin'
    status: { type: String, default: 'active' } // 'active', 'inactive', 'removed'
  }],

  // ✅ Optional: other Kametis this user created or joined
  kametis: {
    type: Array,
    default: [],
  },

  // ✅ Identity Verification Fields
  identityVerified: {
    type: Boolean,
    default: false,
  },
  
  verificationDate: {
    type: Date,
  },
  
  // ✅ Additional Security Fields
  lastLogin: {
    type: Date,
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
  },
  
  accountLocked: {
    type: Boolean,
    default: false,
  },

  // ✅ Profile Completion Status
  profileComplete: {
    type: Boolean,
    default: false,
  },

  // ✅ Password Reset Fields
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // ✅ Two-Factor Authentication Fields
  twoFactorEnabled: { 
    type: Boolean, 
    default: false 
  },
  twoFactorSecret: { 
    type: String 
  },
  twoFactorBackupCodes: [{ 
    type: String 
  }],
  twoFactorVerified: { 
    type: Boolean, 
    default: false 
  },

  // ✅ Payment Status Fields (Single definition)
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'pending'],
    default: 'unpaid'
  },
  lastPaymentDate: {
    type: Date
  },
  lastTransactionId: {
    type: String
  },
  lastPaymentAmount: {
    type: Number
  },
  lastPaymentMethod: {
    type: String
  },

  // ✅ Notifications Array
  notifications: [{
    type: {
      type: String,
      enum: ['payment_received', 'join_request', 'request_approved', 'request_rejected', 'kameti_update', 'dispute_raised', 'dispute_resolved']
    },
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

// ✅ Method to check if profile is complete
userSchema.methods.isProfileComplete = function() {
  return !!(
    this.fullName &&
    this.email &&
    this.phone &&
    this.cnic
  );
};

// ✅ Hash password before saving (removed - now handled in routes)
// Note: Password is already hashed in userRoutes.js before saving
userSchema.pre('save', async function (next) {
  // Password hashing is now done in the route handler
  // to avoid double-hashing
  next();
});

module.exports = mongoose.model('User', userSchema);
