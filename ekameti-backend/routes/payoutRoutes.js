const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const PayoutService = require('../services/PayoutService');
const PaymentReminderService = require('../services/PaymentReminderService');
const Payout = require('../models/Payout');
const Kameti = require('../models/Kameti');

// Check if round is ready for payout
router.get('/check-readiness/:kametiId', authenticateUser, async (req, res) => {
  try {
    let { kametiId } = req.params;
    const userId = req.user.userId || req.user.id;
    
    // ✅ Handle both MongoDB _id and kametiId string
    // If it looks like MongoDB ObjectId (24 hex chars), find by _id first, then kametiId
    let kameti = null;
    if (kametiId.length === 24 && /^[0-9a-fA-F]{24}$/.test(kametiId)) {
      kameti = await Kameti.findById(kametiId);
      if (kameti) {
        kametiId = kameti.kametiId; // Use the kametiId string for services
      }
    }
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId });
    }
    
    const { autoSendReminders } = req.query;
    const readiness = await PayoutService.checkRoundReadiness(kametiId);
    const eligibleRecipients = await PayoutService.getEligibleRecipients(kametiId);

    // Check if current user is creator/admin
    const isCreator = kameti && kameti.createdBy && userId && (
      kameti.createdBy.toString() === userId.toString()
    );

    let remindersResult = null;
    if (autoSendReminders === 'true' && !readiness.ready) {
      remindersResult = await PaymentReminderService.autoSendRemindersIfNeeded(kametiId);
    }

    res.json({ success: true, readiness, eligibleRecipients, remindersSent: remindersResult, isCreator: !!isCreator });
  } catch (error) {
    console.error('Check readiness error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to check round readiness' });
  }
});

// Get eligible recipients
router.get('/eligible-recipients/:kametiId', authenticateUser, async (req, res) => {
  try {
    let { kametiId } = req.params;
    
    // ✅ Handle both MongoDB _id and kametiId string
    if (kametiId.length === 24 && /^[0-9a-fA-F]{24}$/.test(kametiId)) {
      const kametiById = await Kameti.findById(kametiId);
      if (kametiById) {
        kametiId = kametiById.kametiId;
      }
    }
    
    const eligibleRecipients = await PayoutService.getEligibleRecipients(kametiId);
    res.json({ success: true, eligibleRecipients });
  } catch (error) {
    console.error('Get eligible recipients error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get eligible recipients' });
  }
});

// Select recipient (preview)
router.post('/select-recipient/:kametiId', authenticateUser, async (req, res) => {
  try {
    let { kametiId } = req.params;
    const { recipientId } = req.body;
    const userId = req.user.userId || req.user.id;

    // ✅ Handle both MongoDB _id and kametiId string
    let kameti = null;
    if (kametiId.length === 24 && /^[0-9a-fA-F]{24}$/.test(kametiId)) {
      kameti = await Kameti.findById(kametiId);
      if (kameti) {
        kametiId = kameti.kametiId;
      }
    }
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId });
    }
    if (!kameti) return res.status(404).json({ success: false, message: 'Kameti not found' });

    const isCreator = kameti.createdBy?.toString() === userId.toString();
    if (!isCreator && kameti.payoutOrder !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only kameti creator can select recipients' });
    }

    const selection = await PayoutService.selectRecipient(kametiId, null, recipientId);
    res.json({ success: true, selection });
  } catch (error) {
    console.error('Select recipient error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to select recipient' });
  }
});

// Process payout
router.post('/process/:kametiId', authenticateUser, async (req, res) => {
  try {
    let { kametiId } = req.params;
    const { recipientId } = req.body;
    const userId = req.user.userId || req.user.id;

    // ✅ Handle both MongoDB _id and kametiId string
    let kameti = null;
    if (kametiId.length === 24 && /^[0-9a-fA-F]{24}$/.test(kametiId)) {
      kameti = await Kameti.findById(kametiId);
      if (kameti) {
        kametiId = kameti.kametiId; // Use kametiId string for services
      }
    }
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId });
    }
    if (!kameti) return res.status(404).json({ success: false, message: 'Kameti not found' });

    const isCreator = kameti.createdBy?.toString() === userId.toString();
    if (!isCreator) return res.status(403).json({ success: false, message: 'Only kameti creator can process payouts' });

    const readiness = await PayoutService.checkRoundReadiness(kametiId);
    if (!readiness.ready) {
      return res.status(400).json({ success: false, message: `Round not ready: ${readiness.reason}`, readiness });
    }

    let finalRecipientId = recipientId;
    if (!finalRecipientId) {
      if (kameti.payoutOrder === 'admin') {
        return res.status(400).json({ success: false, message: 'Recipient required in admin mode', readiness });
      }
      const selection = await PayoutService.selectRecipient(kametiId, null, null);
      finalRecipientId = selection.recipient.userId;
    }

    const result = await PayoutService.processPayout(kametiId, finalRecipientId, userId);
    
    // ✅ Double-check completion status after payout (ensures status is updated)
    await PayoutService.checkAndUpdateCompletionStatus(kametiId);
    
    // Reload kameti to get updated status
    const updatedKameti = await Kameti.findOne({ kametiId });
    
    res.json({ 
      success: true, 
      message: 'Payout processed successfully', 
      payout: result.payout, 
      nextRound: result.nextRound, 
      isCompleted: result.isCompleted,
      kametiStatus: updatedKameti?.status || kameti.status
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to process payout' });
  }
});

// Get payout history
router.get('/history/:kametiId', authenticateUser, async (req, res) => {
  try {
    let { kametiId } = req.params;
    const { limit = 10 } = req.query;

    // ✅ Handle both MongoDB _id and kametiId string
    if (kametiId.length === 24 && /^[0-9a-fA-F]{24}$/.test(kametiId)) {
      const kametiById = await Kameti.findById(kametiId);
      if (kametiById) {
        kametiId = kametiById.kametiId;
      }
    }
    
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) return res.status(404).json({ success: false, message: 'Kameti not found' });

    const payouts = await PayoutService.getPayoutHistory(kametiId, parseInt(limit));
    res.json({ success: true, payouts });
  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to get payout history' });
  }
});

module.exports = router;

