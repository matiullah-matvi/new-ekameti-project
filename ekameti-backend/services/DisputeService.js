const Dispute = require('../models/Dispute');
const Payment = require('../models/Payment');
const PaymentRecord = require('../models/PaymentRecord');
const User = require('../models/User');

class DisputeService {
  /**
   * Generate a unique case ID
   * @returns {string} Case ID
   */
  static generateCaseId() {
    return 'CASE-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  /**
   * Get payment logs for a dispute
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Array>} Payment logs
   */
  static async getPaymentLogs(transactionId) {
    try {
      const payments = await Payment.find({ transactionId })
        .sort({ createdAt: -1 })
        .lean();
      return payments;
    } catch (error) {
      console.error('Error fetching payment logs:', error.message);
      return [];
    }
  }

  /**
   * Get user payment history for dispute review
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Payment history
   */
  static async getUserPaymentHistory(userId, limit = 10) {
    try {
      const history = await PaymentRecord.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('kametiMongoId', 'name kametiId')
        .lean();
      return history;
    } catch (error) {
      console.error('Error fetching user payment history:', error.message);
      return [];
    }
  }

  /**
   * Process dispute resolution (refund, penalty, adjustment)
   * @param {Object} dispute - Dispute object
   * @param {string} resolutionType - Type of resolution
   * @param {number} amount - Amount to process
   * @returns {Promise<Object>} Result of processing
   */
  static async processResolution(dispute, resolutionType, amount) {
    try {
      switch (resolutionType) {
        case 'refund':
          // TODO: Implement refund logic
          // This would integrate with PaymentService to process refunds
          console.log(`Processing refund of ${amount} for dispute ${dispute.caseId}`);
          return { success: true, message: 'Refund processed' };

        case 'penalty':
          // TODO: Implement penalty logic
          console.log(`Processing penalty of ${amount} for dispute ${dispute.caseId}`);
          return { success: true, message: 'Penalty applied' };

        case 'adjustment':
          // TODO: Implement adjustment logic
          console.log(`Processing adjustment of ${amount} for dispute ${dispute.caseId}`);
          return { success: true, message: 'Adjustment processed' };

        case 'no_action':
          return { success: true, message: 'No action required' };

        default:
          return { success: false, message: 'Unknown resolution type' };
      }
    } catch (error) {
      console.error('Error processing resolution:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get dispute statistics
   * @returns {Promise<Object>} Statistics
   */
  static async getStatistics() {
    try {
      const stats = await Dispute.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const total = await Dispute.countDocuments();
      const byPriority = await Dispute.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        }
      ]);

      const byReason = await Dispute.aggregate([
        {
          $group: {
            _id: '$reason',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        total,
        byStatus: stats,
        byPriority,
        byReason
      };
    } catch (error) {
      console.error('Error fetching dispute statistics:', error.message);
      return { total: 0, byStatus: [], byPriority: [], byReason: [] };
    }
  }

  /**
   * Check if user can raise a dispute for a payment
   * @param {string} userId - User ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Validation result
   */
  static async canRaiseDispute(userId, transactionId) {
    try {
      // Check if payment exists and belongs to user
      const payment = await Payment.findOne({ transactionId, userId });
      if (!payment) {
        return { canRaise: false, reason: 'Payment not found or does not belong to you' };
      }

      // Check if dispute already exists for this transaction
      const existingDispute = await Dispute.findOne({
        transactionId,
        userId,
        status: { $in: ['open', 'under_review'] }
      });

      if (existingDispute) {
        return { canRaise: false, reason: 'An open dispute already exists for this transaction' };
      }

      return { canRaise: true };
    } catch (error) {
      console.error('Error checking dispute eligibility:', error.message);
      return { canRaise: false, reason: 'Error checking eligibility' };
    }
  }
}

module.exports = DisputeService;






