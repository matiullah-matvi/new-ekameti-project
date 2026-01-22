const Payment = require('../models/Payment');
const PaymentRecord = require('../models/PaymentRecord');
const Kameti = require('../models/Kameti');
const User = require('../models/User');

class PaymentService {
  
  // Create a new payment record when payment is initiated
  static async createPaymentRecord(paymentData) {
    try {
      console.log('💳 Creating payment record:', paymentData);
      
      const {
        userId,
        userEmail,
        userName,
        kametiId,
        kametiName,
        kametiMongoId,
        amount,
        paymentMethod,
        transactionId,
        round,
        dueDate,
        metadata = {}
      } = paymentData;

      const kameti = await Kameti.findOne({ kametiId });
      const totalRounds = kameti?.membersCount || 1;
      
      // Create main payment record
      const payment = new Payment({
        userId,
        userEmail,
        userName,
        kametiId,
        kametiName,
        kametiMongoId,
        amount,
        paymentMethod,
        transactionId,
        status: 'processing',
        fees: {
          gatewayFee: 0,
          platformFee: 0,
          netAmount: amount // For now, net amount equals gross amount
        },
        metadata: {
          ...metadata,
          source: 'web',
          version: '1.0'
        },
        auditTrail: [{
          action: 'payment_initiated',
          details: { amount, paymentMethod, transactionId },
          performedBy: 'system'
        }]
      });
      
      await payment.save();
      console.log('✅ Payment record created:', payment.paymentId);
      
      // Create payment record for Kameti member
      const paymentRecord = new PaymentRecord({
        kametiId,
        kametiMongoId,
        userId,
        userEmail,
        round,
        totalRounds,
        amount,
        paymentMethod,
        transactionId,
        paymentId: payment.paymentId,
        dueDate: dueDate || new Date(),
        status: 'pending',
        metadata: {
          paymentGatewayResponse: {},
          ipnData: {}
        }
      });
      
      await paymentRecord.save();
      console.log('✅ Payment record created:', paymentRecord._id);
      
      return {
        payment,
        paymentRecord
      };
      
    } catch (error) {
      console.error('❌ Error creating payment record:', error);
      throw error;
    }
  }
  
  // Update payment status when payment is completed
  static async updatePaymentStatus(paymentData) {
    try {
      console.log('💳 Updating payment status:', paymentData);
      
      const {
        transactionId,
        status,
        gatewayResponse,
        ipnData,
        metadata = {}
      } = paymentData;
      
      // Update main payment record
      const payment = await Payment.findOneAndUpdate(
        { transactionId },
        {
          status,
          gatewayResponse,
          ipnData,
          paymentCompletedAt: new Date(),
          $push: {
            auditTrail: {
              action: 'payment_completed',
              details: { status, gatewayResponse },
              performedBy: 'system'
            }
          }
        },
        { new: true }
      );
      
      if (!payment) {
        throw new Error('Payment record not found');
      }
      
      console.log('✅ Payment status updated:', payment.paymentId);
      
      // Update payment record
      const paymentRecord = await PaymentRecord.findOneAndUpdate(
        { transactionId },
        {
          status: status === 'completed' ? 'paid' : 'failed',
          paidAt: status === 'completed' ? new Date() : null,
          metadata: {
            paymentGatewayResponse: gatewayResponse,
            ipnData: ipnData,
            ...metadata
          }
        },
        { new: true }
      );
      
      if (!paymentRecord) {
        throw new Error('Payment record not found');
      }
      
      console.log('✅ Payment record status updated:', paymentRecord._id);
      
      // Update Kameti member status
      await Kameti.updateOne(
        { _id: paymentRecord.kametiMongoId, "members.email": payment.userEmail },
        {
          $set: {
            "members.$.paymentStatus": status === 'completed' ? 'paid' : 'unpaid',
            "members.$.lastPaymentDate": status === 'completed' ? new Date() : null,
            "members.$.transactionId": transactionId
          }
        }
      );
      
      console.log('✅ Kameti member status updated');
      
      return {
        payment,
        paymentRecord
      };
      
    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw error;
    }
  }
  
  // Get payment history for a user
  static async getUserPaymentHistory(userId, limit = 50) {
    try {
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('kametiMongoId', 'name amount')
        .lean();
      
      return payments;
    } catch (error) {
      console.error('❌ Error fetching user payment history:', error);
      throw error;
    }
  }
  
  // Get payment history for a Kameti
  static async getKametiPaymentHistory(kametiId, limit = 100) {
    try {
      const payments = await Payment.find({ kametiId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'fullName email')
        .lean();
      
      return payments;
    } catch (error) {
      console.error('❌ Error fetching Kameti payment history:', error);
      throw error;
    }
  }
  
  // Get payment statistics
  static async getPaymentStatistics(userId = null, kametiId = null) {
    try {
      const matchStage = {};
      if (userId) matchStage.userId = userId;
      if (kametiId) matchStage.kametiId = kametiId;
      
      const stats = await Payment.aggregate([
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
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching payment statistics:', error);
      throw error;
    }
  }
  
  // Get overdue payments
  static async getOverduePayments(kametiId = null) {
    try {
      const overduePayments = await PaymentRecord.getOverduePayments(kametiId);
      return overduePayments;
    } catch (error) {
      console.error('❌ Error fetching overdue payments:', error);
      throw error;
    }
  }
  
  // Create payment notification
  static async createPaymentNotification(paymentData) {
    try {
      const {
        userId,
        userEmail,
        amount,
        transactionId,
        kametiId,
        kametiName,
        status
      } = paymentData;
      
      const notification = {
        type: 'payment_received',
        title: '💰 Payment Received',
        message: `Payment of Rs.${amount} received successfully for Kameti "${kametiName}"`,
        data: {
          amount,
          transactionId,
          paymentMethod: 'payfast',
          paymentStatus: status,
          timestamp: new Date(),
          kametiId,
          kametiName
        },
        read: false,
        createdAt: new Date()
      };
      
      await User.findByIdAndUpdate(
        userId,
        { $push: { notifications: notification } }
      );
      
      console.log('✅ Payment notification created for user:', userEmail);
      return notification;
      
    } catch (error) {
      console.error('❌ Error creating payment notification:', error);
      throw error;
    }
  }

  // Process loan transfers when lender receives kameti payout
  static async processLoanTransfers(lenderId, kametiId, round) {
    try {
      console.log('🔄 Processing loan transfers for lender:', lenderId, 'kameti:', kametiId, 'round:', round);
      
      const LoanPledge = require('../models/LoanPledge');
      const LoanRequest = require('../models/LoanRequest');
      
      // Find all captured pledges for this lender from this kameti that haven't been transferred yet
      const pledges = await LoanPledge.find({
        lenderId: lenderId,
        kametiId: kametiId,
        status: 'captured'
      }).populate('loanId');

      if (!pledges || pledges.length === 0) {
        console.log('✅ No loan pledges to transfer');
        return { transferred: 0, totalAmount: 0 };
      }

      let totalTransferred = 0;
      const transfers = [];

      for (const pledge of pledges) {
        const loan = await LoanRequest.findById(pledge.loanId);
        if (!loan) continue;

        // Get borrower info
        const borrower = await User.findById(loan.borrowerId);
        if (!borrower) continue;

        // Update pledge status to transferred
        pledge.status = 'transferred';
        pledge.transferredAt = new Date();
        pledge.transferRound = round;
        await pledge.save();

        // Create notification for borrower
        const transferNotification = {
          type: 'loan_funded',
          title: '💰 Loan Funded',
          message: `Rs. ${pledge.amount.toLocaleString()} has been transferred to your loan account from lender's kameti payout.`,
          data: {
            loanId: loan._id,
            amount: pledge.amount,
            lenderId: lenderId,
            kametiId: kametiId,
            round: round,
            timestamp: new Date()
          },
          read: false,
          createdAt: new Date()
        };

        if (!borrower.notifications) {
          borrower.notifications = [];
        }
        borrower.notifications.unshift(transferNotification);
        await borrower.save();

        // Create notification for lender
        const lender = await User.findById(lenderId);
        if (lender) {
          const lenderNotification = {
            type: 'loan_transferred',
            title: '💸 Loan Transferred',
            message: `Rs. ${pledge.amount.toLocaleString()} from your kameti payout has been transferred to borrower.`,
            data: {
              loanId: loan._id,
              pledgeId: pledge._id,
              amount: pledge.amount,
              kametiId: kametiId,
              round: round,
              timestamp: new Date()
            },
            read: false,
            createdAt: new Date()
          };

          if (!lender.notifications) {
            lender.notifications = [];
          }
          lender.notifications.unshift(lenderNotification);
          await lender.save();
        }

        totalTransferred += pledge.amount;
        transfers.push({
          pledgeId: pledge._id,
          loanId: loan._id,
          amount: pledge.amount,
          borrowerEmail: borrower.email
        });

        console.log(`✅ Transferred Rs. ${pledge.amount} to borrower ${borrower.email} for loan ${loan._id}`);
      }

      console.log(`✅ Processed ${transfers.length} loan transfers, total: Rs. ${totalTransferred}`);
      return {
        transferred: transfers.length,
        totalAmount: totalTransferred,
        transfers: transfers
      };

    } catch (error) {
      console.error('❌ Error processing loan transfers:', error);
      throw error;
    }
  }
}

module.exports = PaymentService;
