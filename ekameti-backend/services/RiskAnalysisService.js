const PaymentRecord = require('../models/PaymentRecord');
const User = require('../models/User');
const Kameti = require('../models/Kameti');
const Dispute = require('../models/Dispute');
const mongoose = require('mongoose');

/**
 * Lightweight risk analysis service.
 * Scoring rule-of-thumb (0–100): higher = riskier.
 */
class RiskAnalysisService {
  static async calculateUserRisk(userId) {
    const [
      paymentHistory,
      disputeHistory,
      profileInfo,
      activeKametis,
    ] = await Promise.all([
      this.getPaymentBehavior(userId),
      this.getDisputeHistory(userId),
      this.getProfileInfo(userId),
      this.getActiveKametis(userId),
    ]);

    const factors = {
      paymentReliability: this.scorePaymentReliability(paymentHistory),
      disputeRisk: this.scoreDisputes(disputeHistory),
      profileCompleteness: this.scoreProfile(profileInfo),
      financialLoad: this.scoreFinancialLoad(paymentHistory, activeKametis),
      behavioral: this.scoreBehavioral(paymentHistory),
    };

    const riskScore = this.weightedScore(factors);

    return {
      riskScore: Math.round(riskScore),
      riskLevel: this.levelFromScore(riskScore),
      factors,
      meta: {
        lastPaymentDate: paymentHistory.lastPaymentDate,
        totalPayments: paymentHistory.totalPayments,
        accountAgeDays: profileInfo.accountAgeDays,
        activeKametis: activeKametis.count,
      },
      recommendations: this.recommendations(factors, riskScore),
    };
  }

  /**
   * Kameti-level safety snapshot (no PII, safe for any authenticated user).
   */
  static async calculateKametiRiskSummary(kametiId) {
    console.log('[risk] Calculating kameti risk summary for:', kametiId);
    let kameti = await Kameti.findOne({ kametiId }).lean();
    // Fallback: if not found by kametiId, try Mongo _id (ObjectId)
    if (!kameti && mongoose?.Types?.ObjectId?.isValid(kametiId)) {
      console.log('[risk] Trying to find by _id:', kametiId);
      kameti = await Kameti.findById(kametiId).lean();
    }
    if (!kameti) {
      console.warn('[risk] Kameti not found for risk summary', { kametiId });
      const err = new Error('Kameti not found');
      err.status = 404;
      throw err;
    }
    console.log('[risk] Kameti found:', { kametiId: kameti.kametiId, _id: kameti._id, status: kameti.status });

    // Use the actual kametiId from the found kameti for queries (PaymentRecord and Dispute use kametiId as String)
    const actualKametiId = kameti.kametiId;
    if (!actualKametiId) {
      console.warn('[risk] Kameti found but no kametiId field:', kameti);
      const err = new Error('Kameti ID not found');
      err.status = 500;
      throw err;
    }
    console.log('[risk] Using kametiId for queries:', actualKametiId);

    // Overdue payments - check for pending payments that are overdue
    const overdue = await PaymentRecord.countDocuments({
      kametiId: actualKametiId,
      status: 'pending',
      dueDate: { $lt: new Date() },
    });
    console.log('[risk] Overdue payments count:', overdue);

    // Also check for any pending payments (not just overdue)
    const pendingPayments = await PaymentRecord.countDocuments({
      kametiId: actualKametiId,
      status: 'pending',
    });
    console.log('[risk] Total pending payments:', pendingPayments);

    // Disputes - check all disputes for this kameti
    const disputes = await Dispute.countDocuments({
      kametiId: actualKametiId
    });
    console.log('[risk] Total disputes count:', disputes);

    // Open disputes specifically
    const openDisputes = await Dispute.countDocuments({
      kametiId: actualKametiId,
      status: 'open'
    });
    console.log('[risk] Open disputes count:', openDisputes);

    // Members risk proxy: size and payout order
    const memberCount = kameti.members?.length || 0;
    const payoutOrder = kameti.payoutOrder || 'random';

    // Simple scoring (0–100, higher = riskier)
    let score = 0;
    score += Math.min(40, overdue * 5); // overdue weight
    score += Math.min(25, openDisputes * 5); // open disputes weight (more relevant than total)
    if (pendingPayments > 0 && overdue === 0) score += 5; // pending but not overdue yet
    if (memberCount > 15) score += 10;
    if (kameti.status === 'Pending') score += 5;
    if (payoutOrder === 'random') score += 5;

    const riskLevel = this.levelFromScore(score);

    console.log('[risk] Calculated risk score:', {
      score: Math.round(score),
      level: riskLevel,
      overdue,
      openDisputes,
      pendingPayments,
      memberCount
    });

    return {
      kametiId: actualKametiId,
      kametiName: kameti.name,
      riskScore: Math.round(score),
      riskLevel,
      signals: {
        overduePayments: overdue,
        pendingPayments: pendingPayments,
        openDisputes: openDisputes,
        totalDisputes: disputes,
        memberCount,
        payoutOrder,
        status: kameti.status,
      },
      message: this.kametiSummaryMessage(riskLevel, overdue, openDisputes),
    };
  }

  // --- Data collectors -----------------------------------------------------
  static async getPaymentBehavior(userId) {
    console.log('[risk] Fetching payment behavior for user:', userId);
    const payments = await PaymentRecord.find({ userId })
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();

    console.log('[risk] Found payment records:', payments.length);

    if (!payments.length) {
      console.log('[risk] No payment history found for user');
      return {
        totalPayments: 0,
        onTime: 0,
        late: 0,
        failed: 0,
        avgDaysLate: 0,
        lastPaymentDate: null,
        dates: [],
      };
    }

    let onTime = 0;
    let late = 0;
    let failed = 0;
    let totalDaysLate = 0;
    const dates = [];

    payments.forEach((p) => {
      // Check actual payment status from database
      if (p.status === 'paid') {
        // Check if payment was late based on dueDate and paidAt
        if (p.dueDate && p.paidAt) {
          const daysLate = Math.ceil((new Date(p.paidAt) - new Date(p.dueDate)) / (1000 * 60 * 60 * 24));
          if (daysLate > 0 || p.isLate) {
            late += 1;
            totalDaysLate += p.daysLate || daysLate || 0;
          } else {
            onTime += 1;
          }
        } else if (p.isLate) {
          // Use isLate flag if available
          late += 1;
          totalDaysLate += p.daysLate || 0;
        } else {
          // If no due date info, assume on-time if status is paid
          onTime += 1;
        }
        if (p.paidAt) dates.push(new Date(p.paidAt));
      } else if (p.status === 'pending') {
        // Check if pending payment is overdue
        if (p.dueDate && new Date(p.dueDate) < new Date()) {
          // This is an overdue pending payment
          const daysOverdue = Math.ceil((Date.now() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          late += 1;
          totalDaysLate += daysOverdue;
        }
      } else if (['failed', 'cancelled', 'overdue'].includes(p.status)) {
        failed += 1;
      }
    });
    
    console.log('[risk] Payment analysis:', {
      total: payments.length,
      onTime,
      late,
      failed,
      avgDaysLate: late ? totalDaysLate / late : 0
    });

    return {
      totalPayments: payments.length,
      onTime,
      late,
      failed,
      avgDaysLate: late ? totalDaysLate / late : 0,
      lastPaymentDate: dates[0] || null,
      dates,
    };
  }

  static async getDisputeHistory(userId) {
    console.log('[risk] Fetching dispute history for user:', userId);
    const disputes = await Dispute.find({ userId }).lean();
    const total = disputes.length;
    const open = disputes.filter((d) => d.status === 'open').length;
    const rejected = disputes.filter((d) => d.status === 'rejected').length;
    console.log('[risk] Dispute history:', { total, open, rejected });
    return { total, open, rejected };
  }

  static async getProfileInfo(userId) {
    console.log('[risk] Fetching profile info for user:', userId);
    const user = await User.findById(userId).lean();
    if (!user) {
      console.warn('[risk] User not found:', userId);
      return {
        hasCNIC: false,
        hasPhone: false,
        isVerified: false,
        profileComplete: false,
        accountAgeDays: 0,
      };
    }
    const createdAt = user?.createdAt ? new Date(user.createdAt) : new Date();
    const accountAgeDays = Math.max(
      1,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const profileInfo = {
      hasCNIC: !!user?.cnic,
      hasPhone: !!user?.phone,
      isVerified: !!user?.identityVerified,
      profileComplete: !!user?.profileComplete,
      accountAgeDays,
    };
    console.log('[risk] Profile info:', profileInfo);
    return profileInfo;
  }

  static async getActiveKametis(userId) {
    const kametis = await Kameti.find({
      'members.userId': userId,
      status: { $in: ['Active', 'Pending'] },
    })
      .select(['amount'])
      .lean();

    return {
      count: kametis.length,
      totalAmount: kametis.reduce((sum, k) => sum + (k.amount || 0), 0),
    };
  }

  // --- Scoring helpers -----------------------------------------------------
  static scorePaymentReliability(beh) {
    // If no payment history, give neutral score (not too risky, not too safe)
    if (beh.totalPayments === 0) {
      console.log('[risk] No payment history - neutral score');
      return 50;
    }
    
    // Calculate on-time rate based on actual paid payments
    const totalPaid = beh.onTime + beh.late;
    const onTimeRate = totalPaid > 0 ? beh.onTime / totalPaid : 0;
    const failedRate = beh.totalPayments > 0 ? beh.failed / beh.totalPayments : 0;
    const lateRate = totalPaid > 0 ? beh.late / totalPaid : 0;
    
    // Risk score calculation based on real data:
    // - Lower on-time rate = higher risk
    // - More late payments = higher risk
    // - More failed payments = much higher risk
    // - Average days late contributes to risk
    let score = 0;
    score += (1 - onTimeRate) * 40; // Up to 40 points for late payment rate
    score += lateRate * 30; // Up to 30 points for late payment frequency
    score += Math.min(30, beh.avgDaysLate * 2); // Up to 30 points for severity of lateness
    score += failedRate * 30; // Up to 30 points for failed payments
    
    const finalScore = Math.min(100, Math.max(0, score));
    console.log('[risk] Payment reliability score:', {
      onTimeRate: (onTimeRate * 100).toFixed(1) + '%',
      lateRate: (lateRate * 100).toFixed(1) + '%',
      failedRate: (failedRate * 100).toFixed(1) + '%',
      avgDaysLate: beh.avgDaysLate.toFixed(1),
      score: finalScore.toFixed(1)
    });
    
    return finalScore;
  }

  static scoreDisputes(disputes) {
    if (!disputes.total) {
      console.log('[risk] No disputes - zero risk');
      return 0;
    }
    
    // Real dispute risk calculation:
    // - Open disputes are most concerning (active issues)
    // - Rejected disputes indicate problematic behavior
    // - Total disputes show pattern of disputes
    const openWeight = disputes.open * 15; // Each open dispute = 15 points
    const rejectedWeight = disputes.rejected * 12; // Each rejected = 12 points (less than open)
    const totalWeight = disputes.total * 3; // Each dispute = 3 points (pattern indicator)
    
    const score = Math.min(100, openWeight + rejectedWeight + totalWeight);
    console.log('[risk] Dispute risk score:', {
      total: disputes.total,
      open: disputes.open,
      rejected: disputes.rejected,
      score: score.toFixed(1)
    });
    
    return score;
  }

  static scoreProfile(profile) {
    // Real profile completeness scoring based on actual user data
    let risk = 0;
    if (!profile.hasCNIC) {
      risk += 20; // Missing CNIC is significant risk
      console.log('[risk] Missing CNIC: +20 risk');
    }
    if (!profile.hasPhone) {
      risk += 10; // Missing phone is moderate risk
      console.log('[risk] Missing phone: +10 risk');
    }
    if (!profile.isVerified) {
      risk += 20; // Unverified identity is significant risk
      console.log('[risk] Unverified identity: +20 risk');
    }
    if (!profile.profileComplete) {
      risk += 10; // Incomplete profile is moderate risk
      console.log('[risk] Incomplete profile: +10 risk');
    }
    if (profile.accountAgeDays < 30) {
      risk += 10; // New account is moderate risk
      console.log('[risk] New account (<30 days): +10 risk');
    }
    
    const finalScore = Math.min(100, risk);
    console.log('[risk] Profile completeness score:', {
      hasCNIC: profile.hasCNIC,
      hasPhone: profile.hasPhone,
      isVerified: profile.isVerified,
      profileComplete: profile.profileComplete,
      accountAgeDays: profile.accountAgeDays,
      score: finalScore
    });
    
    return finalScore;
  }

  static scoreFinancialLoad(beh, akt) {
    // Real financial load calculation based on actual data
    // Ratio of active kametis to payment history
    const totalPayments = beh.totalPayments || 0;
    const activeKametis = akt.count || 0;
    
    // If no payment history but has active kametis, that's risky
    if (totalPayments === 0 && activeKametis > 0) {
      console.log('[risk] Financial load: No payment history but active kametis - high risk');
      return 60;
    }
    
    // Calculate ratio: active kametis per payment
    const ratio = totalPayments > 0 ? activeKametis / totalPayments : activeKametis;
    
    let score = 20; // Base risk
    if (ratio > 0.6) {
      score = 60; // High risk: many kametis, few payments
    } else if (ratio > 0.3) {
      score = 40; // Medium risk
    }
    
    console.log('[risk] Financial load score:', {
      activeKametis,
      totalPayments,
      ratio: ratio.toFixed(2),
      score
    });
    
    return score;
  }

  static scoreBehavioral(beh) {
    // Real behavioral pattern analysis based on actual payment data
    const totalPaid = beh.onTime + beh.late;
    if (totalPaid === 0) {
      console.log('[risk] Behavioral: No payment history - neutral score');
      return 20; // Neutral if no data
    }
    
    const lateRate = beh.late / totalPaid;
    let score = 20; // Base score
    
    if (lateRate > 0.5) {
      score = 70; // High risk: more than 50% payments are late
    } else if (lateRate > 0.3) {
      score = 50; // Medium risk: 30-50% payments are late
    } else if (lateRate > 0.1) {
      score = 35; // Low-medium risk: 10-30% payments are late
    }
    
    // Factor in average days late for severity
    if (beh.avgDaysLate > 7) {
      score += 10; // Very late payments add risk
    } else if (beh.avgDaysLate > 3) {
      score += 5; // Moderately late payments add some risk
    }
    
    const finalScore = Math.min(100, score);
    console.log('[risk] Behavioral score:', {
      lateRate: (lateRate * 100).toFixed(1) + '%',
      avgDaysLate: beh.avgDaysLate.toFixed(1),
      score: finalScore
    });
    
    return finalScore;
  }

  static weightedScore(factors) {
    // Calculate weighted risk score from real factor data
    const paymentWeight = 0.35;
    const disputeWeight = 0.20;
    const profileWeight = 0.15;
    const financialWeight = 0.15;
    const behavioralWeight = 0.15;
    
    const weightedScore = (
      factors.paymentReliability * paymentWeight +
      factors.disputeRisk * disputeWeight +
      factors.profileCompleteness * profileWeight +
      factors.financialLoad * financialWeight +
      factors.behavioral * behavioralWeight
    );
    
    console.log('[risk] Weighted risk score calculation:', {
      paymentReliability: factors.paymentReliability.toFixed(1) + ` (${(paymentWeight * 100)}%)`,
      disputeRisk: factors.disputeRisk.toFixed(1) + ` (${(disputeWeight * 100)}%)`,
      profileCompleteness: factors.profileCompleteness.toFixed(1) + ` (${(profileWeight * 100)}%)`,
      financialLoad: factors.financialLoad.toFixed(1) + ` (${(financialWeight * 100)}%)`,
      behavioral: factors.behavioral.toFixed(1) + ` (${(behavioralWeight * 100)}%)`,
      finalScore: weightedScore.toFixed(1)
    });
    
    return weightedScore;
  }

  static levelFromScore(score) {
    if (score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
  }

  static recommendations(factors, score) {
    const recs = [];
    if (factors.paymentReliability > 60) {
      recs.push({ priority: 'high', message: 'Require advance payment or collateral for this user.' });
    }
    if (factors.disputeRisk > 40) {
      recs.push({ priority: 'medium', message: 'High dispute involvement; enforce manual review.' });
    }
    if (factors.profileCompleteness > 40) {
      recs.push({ priority: 'medium', message: 'Ask user to complete profile and verify identity.' });
    }
    if (score > 70) {
      recs.push({ priority: 'critical', message: 'Flag for admin review before approving payouts/joins.' });
    }
    if (!recs.length) {
      recs.push({ priority: 'low', message: 'User appears low risk. Standard monitoring applies.' });
    }
    return recs;
  }

  static kametiSummaryMessage(level, overdue, disputes) {
    if (level === 'low') {
      return overdue === 0 && disputes === 0 
        ? 'Low risk: stable payments and no disputes. Safe to join.'
        : 'Low risk: stable payments and few disputes.';
    }
    if (level === 'medium') {
      return `Moderate risk: ${overdue} overdue payment${overdue !== 1 ? 's' : ''}, ${disputes} dispute${disputes !== 1 ? 's' : ''}. Monitor payments.`;
    }
    if (level === 'high') {
      return `High risk: ${overdue} overdue payment${overdue !== 1 ? 's' : ''} and ${disputes} dispute${disputes !== 1 ? 's' : ''}. Proceed with caution.`;
    }
    return `Critical risk: ${overdue} overdue payment${overdue !== 1 ? 's' : ''} and ${disputes} dispute${disputes !== 1 ? 's' : ''}. Recommend admin review before joining.`;
  }
}

module.exports = RiskAnalysisService;

