const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const LoanRequest = require('../models/LoanRequest');
const LoanPledge = require('../models/LoanPledge');
const LoanRepayment = require('../models/LoanRepayment');
const User = require('../models/User');
const Kameti = require('../models/Kameti');

// Create loan request (borrower) - must be within a kameti
router.post('/loans', authenticateUser, async (req, res) => {
  try {
    const borrowerId = req.user.userId || req.user.id;
    const { amount, targetAmount, termMonths, interestRate, purpose, scheduleType = 'amortized', kametiId } = req.body;

    if (!amount || !termMonths || !purpose || !kametiId) {
      return res.status(400).json({ message: 'amount, termMonths, purpose, and kametiId are required' });
    }

    // Verify borrower is a member of the kameti
    const kameti = await Kameti.findOne({ kametiId: kametiId });
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    // Get borrower user info
    const borrower = await User.findById(borrowerId);
    if (!borrower) {
      return res.status(404).json({ success: false, message: 'Borrower not found' });
    }

    // Check if borrower is a member of the kameti
    const isMember = kameti.members.some(m => 
      m.userId?.toString() === borrowerId.toString() || m.email === borrower.email
    );
    const isCreator = kameti.createdBy?.toString() === borrowerId.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a member of this kameti to request a loan' 
      });
    }

    const loan = await LoanRequest.create({
      borrowerId,
      kametiId: kametiId,
      kametiMongoId: kameti._id,
      amount,
      targetAmount: targetAmount || amount,
      termMonths,
      interestRate: interestRate || 0,
      purpose,
      scheduleType,
    });

    res.status(201).json({ success: true, loan });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ success: false, message: 'Failed to create loan', error: error.message });
  }
});

// List loans - filtered by kametiId (internal to kameti)
router.get('/loans', authenticateUser, async (req, res) => {
  try {
    const { status = 'open', minAmount, maxAmount, risk, kametiId } = req.query;
    
    if (!kametiId) {
      return res.status(400).json({ success: false, message: 'kametiId is required' });
    }

    const match = { kametiId: kametiId };
    if (status) match.status = status;
    if (minAmount) match.amount = { ...(match.amount || {}), $gte: Number(minAmount) };
    if (maxAmount) match.amount = { ...(match.amount || {}), $lte: Number(maxAmount) };
    if (risk) match.riskLevel = risk;

    const loans = await LoanRequest.find(match).sort({ createdAt: -1 }).lean();
    res.json({ success: true, loans });
  } catch (error) {
    console.error('List loans error:', error);
    res.status(500).json({ success: false, message: 'Failed to list loans', error: error.message });
  }
});

// Loan detail
router.get('/loans/:id', authenticateUser, async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id).lean();
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    const pledges = await LoanPledge.find({ loanId: loan._id }).lean();
    const repayments = await LoanRepayment.find({ loanId: loan._id }).sort({ dueDate: 1 }).lean();
    res.json({ success: true, loan, pledges, repayments });
  } catch (error) {
    console.error('Loan detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch loan detail', error: error.message });
  }
});

// Lender pledge - initiates PayFast payment
router.post('/loans/:id/pledge', authenticateUser, async (req, res) => {
  try {
    const lenderId = req.user.userId || req.user.id;
    const { amount, kametiId } = req.body;
    
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required' });

    const loan = await LoanRequest.findById(req.params.id).populate('borrowerId');
    if (!loan || loan.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Loan not open for pledges' });
    }

    // Verify loan has kametiId (required for internal loans)
    if (!loan.kametiId) {
      return res.status(400).json({ success: false, message: 'Loan is not associated with a kameti' });
    }

    // Get lender user info
    const lender = await User.findById(lenderId);
    if (!lender) {
      return res.status(404).json({ success: false, message: 'Lender not found' });
    }

    // Find the loan's kameti
    const loanKameti = await Kameti.findOne({ kametiId: loan.kametiId });
    if (!loanKameti) {
      return res.status(404).json({ success: false, message: 'Loan kameti not found' });
    }

    // Verify lender is a member of the same kameti as the loan
    const isLenderMember = loanKameti.members.some(m => 
      m.userId?.toString() === lenderId.toString() || m.email === lender.email
    );
    const isLenderCreator = loanKameti.createdBy?.toString() === lenderId.toString();

    if (!isLenderMember && !isLenderCreator) {
      return res.status(403).json({ 
        success: false, 
        message: 'You must be a member of the same kameti as the loan to lend. Only fellow kameti members can fund this loan.' 
      });
    }

    // Verify kametiId in request matches loan's kametiId (if provided)
    if (kametiId && kametiId !== loan.kametiId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Kameti ID mismatch. You can only lend from the same kameti as the loan.' 
      });
    }

    // Use the loan's kameti
    const lenderKameti = loanKameti;

    // Create pending pledge
    const pledge = await LoanPledge.create({
      loanId: loan._id,
      lenderId,
      amount: Number(amount),
      status: 'pending',
      kametiId: lenderKameti.kametiId,
      kametiMongoId: lenderKameti._id
    });

    // Generate PayFast payment URL
    const transactionId = `LOAN-PLEDGE-${pledge._id}-${Date.now()}`;
    
    // Call PayFast initiate endpoint internally
    const axios = require('axios');
    const payfastResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/payfast/initiate`, {
      amount: Number(amount),
      item_name: `P2P Loan Pledge - ${loan.purpose}`,
      item_description: `Lending Rs. ${amount} for loan request: ${loan.purpose}`,
      user_email: lender.email,
      user_name: lender.fullName,
      kameti_id: lenderKameti.kametiId,
      loan_pledge_id: pledge._id.toString(), // Pass pledge ID for PayFast to identify loan payments
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/p2p/loans/${loan._id}?pledge=success&kametiId=${loan.kametiId}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/p2p/loans/${loan._id}?pledge=cancelled&kametiId=${loan.kametiId}`
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Store transaction ID in pledge
    pledge.txId = transactionId;
    await pledge.save();

    // Return PayFast URL for redirect
    res.status(201).json({ 
      success: true, 
      paymentUrl: payfastResponse.data.paymentUrl,
      pledgeId: pledge._id,
      transactionId
    });
  } catch (error) {
    console.error('Pledge error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate pledge payment', error: error.message });
  }
});

// Activate loan (after fully funded) and stub repayment schedule
router.post('/loans/:id/activate', authenticateUser, async (req, res) => {
  try {
    const loan = await LoanRequest.findById(req.params.id);
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    if (loan.status !== 'funded' && loan.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Loan is not ready to activate' });
    }
    loan.status = 'active';
    loan.activationDate = new Date();
    await loan.save();
    res.json({ success: true, loan });
  } catch (error) {
    console.error('Activate loan error:', error);
    res.status(500).json({ success: false, message: 'Failed to activate loan', error: error.message });
  }
});

// Borrower repayment
router.post('/loans/:id/repay', authenticateUser, async (req, res) => {
  try {
    const borrowerId = req.user.userId || req.user.id;
    const { repaymentId, amountPaid, txId } = req.body;
    if (!repaymentId || !amountPaid) {
      return res.status(400).json({ success: false, message: 'repaymentId and amountPaid required' });
    }

    const loan = await LoanRequest.findById(req.params.id);
    if (!loan || loan.borrowerId.toString() !== borrowerId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this loan' });
    }

    const repayment = await LoanRepayment.findById(repaymentId);
    if (!repayment) return res.status(404).json({ success: false, message: 'Repayment not found' });

    repayment.amountPaid = Number(amountPaid);
    repayment.txId = txId;
    repayment.paidAt = new Date();
    repayment.status = 'paid';
    await repayment.save();

    res.json({ success: true, repayment });
  } catch (error) {
    console.error('Repay error:', error);
    res.status(500).json({ success: false, message: 'Failed to repay', error: error.message });
  }
});

// Repayment history
router.get('/loans/:id/repayments', authenticateUser, async (req, res) => {
  try {
    const repayments = await LoanRepayment.find({ loanId: req.params.id }).sort({ dueDate: 1 }).lean();
    res.json({ success: true, repayments });
  } catch (error) {
    console.error('List repayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to list repayments', error: error.message });
  }
});

// Process loan transfers when lender receives kameti payout
// This endpoint should be called when processing kameti payouts
router.post('/process-transfers', authenticateUser, async (req, res) => {
  try {
    const lenderId = req.user.userId || req.user.id;
    const { kametiId, round } = req.body;

    if (!kametiId || !round) {
      return res.status(400).json({ success: false, message: 'kametiId and round are required' });
    }

    const PaymentService = require('../services/PaymentService');
    const result = await PaymentService.processLoanTransfers(lenderId, kametiId, round);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Process transfers error:', error);
    res.status(500).json({ success: false, message: 'Failed to process loan transfers', error: error.message });
  }
});

module.exports = router;

