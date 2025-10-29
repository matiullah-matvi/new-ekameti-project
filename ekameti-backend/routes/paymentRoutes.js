const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const Payment = require('../models/Payment');
const PaymentRecord = require('../models/PaymentRecord');

// ✅ GET PAYMENT HISTORY: Get payment history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    console.log('📊 Fetching payment history for user:', userId);
    
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('kametiMongoId', 'name amount kametiId')
      .lean();
    
    const totalCount = await Payment.countDocuments({ userId });
    
    res.json({
      success: true,
      payments,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
});

// ✅ GET KAMETI PAYMENT HISTORY: Get payment history for a Kameti
router.get('/kameti/:kametiId', async (req, res) => {
  try {
    const { kametiId } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    console.log('📊 Fetching payment history for Kameti:', kametiId);
    
    const payments = await Payment.find({ kametiId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('userId', 'fullName email')
      .lean();
    
    const totalCount = await Payment.countDocuments({ kametiId });
    
    res.json({
      success: true,
      payments,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching Kameti payment history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Kameti payment history',
      error: error.message
    });
  }
});

// ✅ GET PAYMENT STATISTICS: Get payment statistics
router.get('/statistics', async (req, res) => {
  try {
    const { userId, kametiId } = req.query;
    
    console.log('📊 Fetching payment statistics:', { userId, kametiId });
    
    const stats = await PaymentService.getPaymentStatistics(userId, kametiId);
    
    // Get additional statistics
    const totalPayments = await Payment.countDocuments(userId ? { userId } : kametiId ? { kametiId } : {});
    const totalAmount = await Payment.aggregate([
      { $match: userId ? { userId } : kametiId ? { kametiId } : {} },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      success: true,
      statistics: {
        statusBreakdown: stats,
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment statistics:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics',
      error: error.message
    });
  }
});

// ✅ GET PAYMENT RECORDS: Get payment records for a user
router.get('/records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { kametiId, status } = req.query;
    
    console.log('📋 Fetching payment records for user:', userId);
    
    const matchStage = { userId };
    if (kametiId) matchStage.kametiId = kametiId;
    if (status) matchStage.status = status;
    
    const records = await PaymentRecord.find(matchStage)
      .sort({ createdAt: -1 })
      .populate('kametiMongoId', 'name kametiId')
      .lean();
    
    res.json({
      success: true,
      records
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment records:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment records',
      error: error.message
    });
  }
});

// ✅ GET OVERDUE PAYMENTS: Get overdue payments
router.get('/overdue', async (req, res) => {
  try {
    const { kametiId } = req.query;
    
    console.log('⏰ Fetching overdue payments:', { kametiId });
    
    const overduePayments = await PaymentService.getOverduePayments(kametiId);
    
    res.json({
      success: true,
      overduePayments
    });
    
  } catch (error) {
    console.error('❌ Error fetching overdue payments:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue payments',
      error: error.message
    });
  }
});

// ✅ GET PAYMENT DETAILS: Get detailed payment information
router.get('/details/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log('🔍 Fetching payment details:', paymentId);
    
    const payment = await Payment.findOne({ paymentId })
      .populate('userId', 'fullName email phone')
      .populate('kametiMongoId', 'name kametiId amount')
      .lean();
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    // Get related payment record
    const paymentRecord = await PaymentRecord.findOne({ paymentId })
      .lean();
    
    res.json({
      success: true,
      payment,
      paymentRecord
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message
    });
  }
});

// ✅ GET PAYMENT BY TRANSACTION ID: Get payment by transaction ID
router.get('/transaction/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    console.log('🔍 Fetching payment by transaction ID:', transactionId);
    
    const payment = await Payment.findOne({ transactionId })
      .populate('userId', 'fullName email phone')
      .populate('kametiMongoId', 'name kametiId amount')
      .lean();
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      payment
    });
    
  } catch (error) {
    console.error('❌ Error fetching payment by transaction ID:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment',
      error: error.message
    });
  }
});

module.exports = router;
