const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Dispute = require('../models/Dispute');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PaymentRecord = require('../models/PaymentRecord');
const Kameti = require('../models/Kameti');
const authenticateUser = require('../middleware/authenticateUser');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = 'uploads/disputes';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF) and PDF files are allowed'));
    }
  }
});

// Reason labels mapping
const REASON_LABELS = {
  'payment_not_recorded': 'Payment Not Recorded',
  'incorrect_amount': 'Incorrect Amount',
  'duplicate_payment': 'Duplicate Payment',
  'refund_request': 'Refund Request',
  'late_fee_dispute': 'Late Fee Dispute',
  'interest_dispute': 'Interest Rate Dispute',
  'payout_issue': 'Payout Issue',
  'member_issue': 'Member Issue',
  'other': 'Other'
};

// ✅ RAISE DISPUTE: User raises a new dispute
router.post('/raise', authenticateUser, upload.array('proof', 5), async (req, res) => {
  try {
    const { reason, explanation, kametiId, paymentRecordId, transactionId } = req.body;
    const userId = req.user.userId || req.user.id;

    // Validation
    if (!reason || !explanation || !kametiId) {
      return res.status(400).json({ 
        message: 'Reason, explanation, and Kameti ID are required' 
      });
    }

    if (explanation.length < 10 || explanation.length > 2000) {
      return res.status(400).json({ 
        message: 'Explanation must be between 10 and 2000 characters' 
      });
    }

    if (!REASON_LABELS[reason]) {
      return res.status(400).json({ message: 'Invalid dispute reason' });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get Kameti
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) {
      return res.status(404).json({ message: 'Kameti not found' });
    }

    // Check if user is a member or creator of this Kameti
    const isMember = kameti.members.some(m => {
      if (!m.userId) return false;
      return m.userId.toString() === userId.toString();
    });
    const isCreator = kameti.createdBy && kameti.createdBy.toString() === userId.toString();
    if (!isMember && !isCreator) {
      return res.status(403).json({ message: 'You are not a member or creator of this Kameti' });
    }

    // Get payment record if provided
    let paymentRecord = null;
    if (paymentRecordId) {
      paymentRecord = await PaymentRecord.findById(paymentRecordId);
      if (!paymentRecord || paymentRecord.userId.toString() !== userId.toString()) {
        return res.status(404).json({ message: 'Payment record not found or does not belong to you' });
      }
    }

    // Get payment if transactionId provided
    let payment = null;
    if (transactionId) {
      payment = await Payment.findOne({ transactionId, userId });
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found or does not belong to you' });
      }
    }

    // Handle proof files
    const proofFiles = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path
    })) : [];

    // Create dispute
    const dispute = new Dispute({
      userId,
      userEmail: user.email,
      userName: user.fullName,
      kametiId,
      kametiMongoId: kameti._id,
      kametiName: kameti.name,
      paymentRecordId: paymentRecord ? paymentRecord._id : null,
      paymentId: payment ? payment.paymentId : null,
      transactionId: transactionId || (payment ? payment.transactionId : null),
      reason,
      reasonLabel: REASON_LABELS[reason],
      explanation,
      proof: proofFiles,
      status: 'open',
      priority: 'medium'
    });

    await dispute.save();

    // ✅ Add activity to Kameti
    if (!kameti.activities) {
      kameti.activities = [];
    }
    kameti.activities.unshift({
      type: 'dispute_raised',
      title: '⚠️ Dispute Raised',
      message: `${user.fullName} raised a dispute: ${REASON_LABELS[reason]}`,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      data: {
        caseId: dispute.caseId,
        reason: reason,
        reasonLabel: REASON_LABELS[reason],
        kametiId: kametiId
      },
      createdAt: new Date()
    });
    
    // Keep only last 50 activities
    if (kameti.activities.length > 50) {
      kameti.activities = kameti.activities.slice(0, 50);
    }
    
    await kameti.save();

    // ✅ Send notifications to all members and admin
    const allMemberIds = [
      kameti.createdBy, // Admin
      ...kameti.members.map(m => m.userId).filter(id => id && id.toString() !== userId.toString()) // All other members
    ];

    const notification = {
      type: 'dispute_raised',
      title: '⚠️ New Dispute Raised',
      message: `${user.fullName} raised a dispute in Kameti "${kameti.name}": ${REASON_LABELS[reason]}`,
      data: {
        caseId: dispute.caseId,
        kametiId: kametiId,
        kametiName: kameti.name,
        kametiMongoId: kameti._id,
        userId: user._id,
        userName: user.fullName,
        reason: reason,
        reasonLabel: REASON_LABELS[reason],
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    // Send notification to all members
    for (const memberId of allMemberIds) {
      if (memberId) {
        try {
          const member = await User.findById(memberId);
          if (member) {
            if (!member.notifications) {
              member.notifications = [];
            }
            member.notifications.unshift(notification);
            
            // Keep only last 50 notifications
            if (member.notifications.length > 50) {
              member.notifications = member.notifications.slice(0, 50);
            }
            
            await member.save();
            console.log(`✅ Notification sent to ${member.email} about dispute ${dispute.caseId}`);
          }
        } catch (notifError) {
          console.error(`⚠️ Failed to send notification to member ${memberId}:`, notifError.message);
        }
      }
    }

    console.log(`✅ Dispute raised: ${dispute.caseId} by ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Dispute raised successfully',
      dispute: {
        caseId: dispute.caseId,
        status: dispute.status,
        createdAt: dispute.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Raise Dispute Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to raise dispute',
      error: error.message
    });
  }
});

// ✅ GET KAMETI DISPUTES: Get all disputes for a specific Kameti
router.get('/kameti/:kametiId', authenticateUser, async (req, res) => {
  try {
    const { kametiId } = req.params;
    const { status } = req.query;

    const matchStage = { kametiId };
    if (status) matchStage.status = status;

    const disputes = await Dispute.find(matchStage)
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      disputes
    });

  } catch (error) {
    console.error('❌ Get Kameti Disputes Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: error.message
    });
  }
});

// ✅ GET USER DISPUTES: Get all disputes for the logged-in user
router.get('/my-disputes', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { status, limit = 50, page = 1 } = req.query;

    const matchStage = { userId };
    if (status) matchStage.status = status;

    const disputes = await Dispute.find(matchStage)
      .populate('kametiMongoId', 'name kametiId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalCount = await Dispute.countDocuments(matchStage);

    return res.status(200).json({
      success: true,
      disputes,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get My Disputes Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: error.message
    });
  }
});

// ✅ GET DISPUTE DETAILS: Get detailed information about a specific dispute
router.get('/:caseId', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.userId || req.user.id;

    const dispute = await Dispute.findOne({ caseId })
      .populate('userId', 'fullName email phone')
      .populate('kametiMongoId', 'name kametiId amount')
      .populate('paymentRecordId')
      .populate('reviewedBy', 'fullName email')
      .lean();

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is the owner or admin (for now, allow owner only)
    if (dispute.userId._id.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not have access to this dispute' });
    }

    // Get related payment information
    let paymentInfo = null;
    if (dispute.transactionId) {
      paymentInfo = await Payment.findOne({ transactionId: dispute.transactionId }).lean();
    }

    return res.status(200).json({
      success: true,
      dispute,
      paymentInfo
    });

  } catch (error) {
    console.error('❌ Get Dispute Details Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute details',
      error: error.message
    });
  }
});

// ✅ ADMIN: GET ALL DISPUTES (for admin review)
router.get('/admin/all', authenticateUser, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const { status, priority, limit = 50, page = 1 } = req.query;

    const matchStage = {};
    if (status) matchStage.status = status;
    if (priority) matchStage.priority = priority;

    const disputes = await Dispute.find(matchStage)
      .populate('userId', 'fullName email phone')
      .populate('kametiMongoId', 'name kametiId')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const totalCount = await Dispute.countDocuments(matchStage);

    // Get statistics
    const stats = await Dispute.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      disputes,
      statistics: stats,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Admin Get All Disputes Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: error.message
    });
  }
});

// ✅ ADMIN: GET DISPUTE DETAILS FOR REVIEW
router.get('/admin/:caseId', authenticateUser, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const { caseId } = req.params;

    const dispute = await Dispute.findOne({ caseId })
      .populate('userId', 'fullName email phone cnic')
      .populate('kametiMongoId', 'name kametiId amount members')
      .populate('paymentRecordId')
      .populate('reviewedBy', 'fullName email')
      .lean();

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Get payment logs
    let paymentLogs = [];
    if (dispute.transactionId) {
      paymentLogs = await Payment.find({ transactionId: dispute.transactionId }).lean();
    }

    // Get user payment history
    const userPaymentHistory = await PaymentRecord.find({ userId: dispute.userId._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('kametiMongoId', 'name kametiId')
      .lean();

    return res.status(200).json({
      success: true,
      dispute,
      paymentLogs,
      userPaymentHistory
    });

  } catch (error) {
    console.error('❌ Admin Get Dispute Details Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute details',
      error: error.message
    });
  }
});

// ✅ ADMIN: MARK DISPUTE AS UNDER REVIEW
router.put('/admin/:caseId/review', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const adminId = req.user.userId || req.user.id;

    const dispute = await Dispute.findOne({ caseId }).populate('kametiMongoId');
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is the creator of the kameti
    const kameti = await Kameti.findById(dispute.kametiMongoId);
    if (!kameti || kameti.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Only the kameti creator can perform this action' });
    }

    if (dispute.status !== 'open') {
      return res.status(400).json({ message: 'Dispute is not in open status' });
    }

    await dispute.markUnderReview(adminId);

    return res.status(200).json({
      success: true,
      message: 'Dispute marked as under review',
      dispute
    });

  } catch (error) {
    console.error('❌ Mark Under Review Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update dispute status',
      error: error.message
    });
  }
});

// ✅ ADMIN: RESOLVE DISPUTE (Approve)
router.put('/admin/:caseId/resolve', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { resolutionType, resolutionAmount, resolutionNotes } = req.body;
    const adminId = req.user.userId || req.user.id;

    if (!resolutionType || !resolutionNotes) {
      return res.status(400).json({ 
        message: 'Resolution type and notes are required' 
      });
    }

    const dispute = await Dispute.findOne({ caseId }).populate('kametiMongoId');
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is the creator of the kameti
    const kameti = await Kameti.findById(dispute.kametiMongoId);
    if (!kameti || kameti.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Only the kameti creator can perform this action' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return res.status(400).json({ message: 'Dispute is already resolved' });
    }

    // Resolve the dispute
    await dispute.resolve('approved', resolutionType, resolutionAmount || 0, resolutionNotes, adminId);

    // TODO: Apply refund/penalty/adjustment based on resolutionType
    // This would integrate with PaymentService to process refunds, etc.

    console.log(`✅ Dispute resolved: ${caseId} by admin ${adminId}`);

    return res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute
    });

  } catch (error) {
    console.error('❌ Resolve Dispute Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error.message
    });
  }
});

// ✅ ADMIN: REJECT DISPUTE
router.put('/admin/:caseId/reject', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { rejectionNotes } = req.body;
    const adminId = req.user.userId || req.user.id;

    if (!rejectionNotes) {
      return res.status(400).json({ message: 'Rejection notes are required' });
    }

    const dispute = await Dispute.findOne({ caseId }).populate('kametiMongoId');
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is the creator of the kameti
    const kameti = await Kameti.findById(dispute.kametiMongoId);
    if (!kameti || kameti.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Only the kameti creator can perform this action' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return res.status(400).json({ message: 'Dispute is already resolved' });
    }

    await dispute.reject(rejectionNotes, adminId);

    console.log(`✅ Dispute rejected: ${caseId} by admin ${adminId}`);

    return res.status(200).json({
      success: true,
      message: 'Dispute rejected',
      dispute
    });

  } catch (error) {
    console.error('❌ Reject Dispute Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reject dispute',
      error: error.message
    });
  }
});

// ✅ ADMIN: DELETE DISPUTE
router.delete('/admin/:caseId', authenticateUser, async (req, res) => {
  try {
    const { caseId } = req.params;
    const adminId = req.user.userId || req.user.id;

    const dispute = await Dispute.findOne({ caseId }).populate('kametiMongoId');
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if user is the creator of the kameti
    const kameti = await Kameti.findById(dispute.kametiMongoId);
    if (!kameti || kameti.createdBy.toString() !== adminId.toString()) {
      return res.status(403).json({ message: 'Only the kameti creator can delete disputes' });
    }

    await Dispute.deleteOne({ caseId });

    console.log(`✅ Dispute deleted: ${caseId} by admin ${adminId}`);

    return res.status(200).json({
      success: true,
      message: 'Dispute deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete Dispute Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete dispute',
      error: error.message
    });
  }
});

// ✅ ADMIN: UPDATE DISPUTE PRIORITY
router.put('/admin/:caseId/priority', authenticateUser, async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const { caseId } = req.params;
    const { priority } = req.body;

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority level' });
    }

    const dispute = await Dispute.findOne({ caseId });
    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    dispute.priority = priority;
    await dispute.save();

    return res.status(200).json({
      success: true,
      message: 'Dispute priority updated',
      dispute
    });

  } catch (error) {
    console.error('❌ Update Priority Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update priority',
      error: error.message
    });
  }
});

module.exports = router;

