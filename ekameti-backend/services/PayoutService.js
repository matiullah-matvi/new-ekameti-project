const Kameti = require('../models/Kameti');
const PaymentRecord = require('../models/PaymentRecord');
const Payout = require('../models/Payout');
const User = require('../models/User');

class PayoutService {
  static async checkRoundReadiness(kametiId, round = null) {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) throw new Error('Kameti not found');

    const currentRound = round || kameti.currentRound || 1;
    const actualMembersCount = kameti.members?.length || 0;
    const configuredMembersCount = kameti.membersCount || actualMembersCount;
    const hasFewerMembers = actualMembersCount < configuredMembersCount;
    const needsPolicyOverride = hasFewerMembers && !kameti.policyOverrides?.allowPayoutWithFewerMembers;

    const effectiveMembersCount = kameti.policyOverrides?.allowPayoutWithFewerMembers
      ? (kameti.policyOverrides?.adjustedMembersCount || actualMembersCount)
      : configuredMembersCount;

    const paidRecords = await PaymentRecord.countDocuments({
      kametiId,
      round: currentRound,
      status: 'paid'
    });
    const paidMembers = kameti.members.filter(m => m.paymentStatus === 'paid').length;

    // ✅ Fix: If all actual members have paid, allow payout regardless of configured count
    // This handles cases where kameti has fewer members than originally configured
    const allActualMembersPaid = paidMembers >= actualMembersCount && actualMembersCount > 0;
    const allConfiguredMembersPaid = paidMembers >= effectiveMembersCount;
    
    const requiredPaidCount = kameti.policyOverrides?.allowPayoutWithFewerMembers
      ? actualMembersCount
      : effectiveMembersCount;

    // ✅ Enhanced logging for debugging
    console.log('🔍 PayoutService.checkRoundReadiness DEBUG:', {
      kametiId,
      currentRound,
      actualMembersCount,
      configuredMembersCount,
      effectiveMembersCount,
      paidRecords,
      paidMembers,
      requiredPaidCount,
      hasFewerMembers,
      needsPolicyOverride,
      allActualMembersPaid,
      allConfiguredMembersPaid,
      members: kameti.members.map(m => ({
        email: m.email,
        paymentStatus: m.paymentStatus,
        hasReceivedPayout: m.hasReceivedPayout
      }))
    });

    // ✅ Allow payout if all actual members have paid, even if fewer than configured
    // OR if all configured members have paid
    const ready = (allActualMembersPaid || allConfiguredMembersPaid) && actualMembersCount > 0;
    
    console.log('🔍 Readiness result:', { ready, reason: ready ? 'All members paid' : 'Not ready' });
    const poolAmount = effectiveMembersCount * (kameti.policyOverrides?.adjustedAmount || kameti.amount);
    const eligibleRecipients = await this.getEligibleRecipients(kametiId, currentRound);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'H1',
        location:'services/PayoutService.js:checkRoundReadiness',
        message:'Readiness computed',
        data:{kametiId,currentRound,actualMembersCount,configuredMembersCount,paidRecords,paidMembers,requiredPaidCount,needsPolicyOverride,ready},
        timestamp:Date.now()
      })
    }).catch(()=>{});
    // #endregion

    return {
      ready,
      reason: needsPolicyOverride
        ? `Only ${actualMembersCount} members joined (expected ${configuredMembersCount}). Admin needs to adjust policy.`
        : ready
          ? 'All members have paid'
          : `${paidRecords || paidMembers}/${effectiveMembersCount} members have paid`,
      paidCount: paidRecords || paidMembers,
      totalMembers: effectiveMembersCount,
      actualMembersCount,
      configuredMembersCount,
      hasFewerMembers,
      needsPolicyOverride,
      poolAmount,
      eligibleRecipients: eligibleRecipients.length,
      round: currentRound,
      totalRounds: kameti.membersCount,
      kametiStatus: kameti.status // ✅ Include kameti status in response
    };
  }

  static async getEligibleRecipients(kametiId) {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) throw new Error('Kameti not found');

    const eligible = [];
    for (const member of kameti.members || []) {
      if (!member.hasReceivedPayout) {
        const user = member.userId ? await User.findById(member.userId) : null;
        eligible.push({
          userId: member.userId,
          email: member.email,
          name: member.name || user?.fullName || member.email,
          hasReceivedPayout: false
        });
      }
    }
    return eligible;
  }

  static async selectRecipient(kametiId, round = null, manualRecipientId = null) {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) throw new Error('Kameti not found');
    const eligibleRecipients = await this.getEligibleRecipients(kametiId);
    if (!eligibleRecipients.length) throw new Error('No eligible recipients for payout');

    if (manualRecipientId) {
      const found = eligibleRecipients.find(r => r.userId?.toString() === manualRecipientId.toString());
      if (!found) throw new Error('Selected recipient is not eligible');
      return { recipient: found, method: 'admin' };
    }

    if (kameti.payoutOrder === 'sequential') {
      return { recipient: eligibleRecipients[0], method: 'sequential' };
    }

    // default random
    const idx = Math.floor(Math.random() * eligibleRecipients.length);
    return { recipient: eligibleRecipients[idx], method: 'random' };
  }

  static async processPayout(kametiId, recipientId = null, processedBy = null) {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) throw new Error('Kameti not found');

    // if no recipientId, auto-select
    let selection;
    if (!recipientId) {
      selection = await this.selectRecipient(kametiId);
      recipientId = selection.recipient.userId;
    } else {
      selection = await this.selectRecipient(kametiId, null, recipientId);
    }

    const recipient = selection.recipient;
    const round = kameti.currentRound || 1;
    
    // ✅ Calculate payout amount based on actual paid members for this round
    const actualPaidMembersCount = kameti.members.filter(m => m.paymentStatus === 'paid').length;
    const amount = kameti.amount * (actualPaidMembersCount || kameti.members.length || 1);

    const payout = await Payout.create({
      kametiId,
      kametiMongoId: kameti._id,
      kametiName: kameti.name,
      round,
      recipientId: recipient.userId,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      amount,
      status: 'completed',
      processedBy
    });

    // update member - mark recipient as having received payout
    const idx = kameti.members.findIndex(m => m.userId?.toString() === recipient.userId?.toString() || m.email === recipient.email);
    if (idx >= 0) {
      kameti.members[idx].hasReceivedPayout = true;
      kameti.members[idx].payoutRound = round;
      kameti.members[idx].paymentStatus = 'unpaid';
      kameti.members[idx].lastPaymentDate = null;
      kameti.members[idx].transactionId = null;
    }

    // ✅ Check if all rounds are completed (all members received payout once) - CHECK IMMEDIATELY AFTER MARKING
    const allMembersReceivedPayout = kameti.members.every(m => m.hasReceivedPayout === true);
    const isCompleted = allMembersReceivedPayout || (round >= kameti.membersCount);
    
    console.log(`🔍 Completion check for kameti ${kametiId} (AFTER marking recipient):`, {
      round,
      membersCount: kameti.membersCount,
      allMembersReceivedPayout,
      membersStatus: kameti.members.map(m => ({ 
        email: m.email, 
        hasReceivedPayout: m.hasReceivedPayout,
        payoutRound: m.payoutRound 
      })),
      isCompleted
    });

    if (isCompleted) {
      // Kameti is completed - set status to Closed and stop
      kameti.status = 'Closed';
      kameti.round = `Closed (${kameti.membersCount} of ${kameti.membersCount})`;
      kameti.currentRound = kameti.membersCount; // Keep at max round
      console.log(`✅ Kameti ${kametiId} marked as Closed - all rounds finished`);
      console.log(`✅ Members who received payout:`, kameti.members.filter(m => m.hasReceivedPayout).map(m => m.email));
    } else {
      // Not completed - reset payment statuses and advance round
      kameti.members.forEach(m => {
        m.paymentStatus = 'unpaid';
        m.lastPaymentDate = null;
        m.transactionId = null;
      });
      kameti.currentRound = round + 1;
      kameti.round = `${kameti.currentRound} of ${kameti.membersCount}`;
    }
    
    await kameti.save();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'H2',
        location:'services/PayoutService.js:processPayout',
        message:'Payout processed',
        data:{kametiId,round,nextRound:kameti.currentRound,recipient:recipient.email,amount,payoutId:payout.payoutId,isCompleted,kametiStatus:kameti.status},
        timestamp:Date.now()
      })
    }).catch(()=>{});
    // #endregion

    return { payout, nextRound: kameti.currentRound, isCompleted, kametiStatus: kameti.status };
  }

  static async getPayoutHistory(kametiId, limit = 10) {
    return Payout.find({ kametiId }).sort({ createdAt: -1 }).limit(limit);
  }

  // ✅ Helper: Check and update kameti completion status
  static async checkAndUpdateCompletionStatus(kametiId) {
    const kameti = await Kameti.findOne({ kametiId });
    if (!kameti) throw new Error('Kameti not found');

    // ✅ More robust check: ensure all members have hasReceivedPayout === true (not undefined/null)
    const allMembersReceivedPayout = kameti.members.length > 0 && 
      kameti.members.every(m => m.hasReceivedPayout === true);
    const isCompleted = allMembersReceivedPayout || (kameti.currentRound > kameti.membersCount);

    console.log(`🔍 Completion check for kameti ${kametiId}:`, {
      currentRound: kameti.currentRound,
      membersCount: kameti.membersCount,
      allMembersReceivedPayout,
      membersStatus: kameti.members.map(m => ({ 
        email: m.email, 
        hasReceivedPayout: m.hasReceivedPayout,
        hasReceivedPayoutType: typeof m.hasReceivedPayout,
        payoutRound: m.payoutRound 
      })),
      isCompleted,
      currentStatus: kameti.status
    });

    if (isCompleted && kameti.status !== 'Closed') {
      kameti.status = 'Closed';
      kameti.round = `Closed (${kameti.membersCount} of ${kameti.membersCount})`;
      kameti.currentRound = kameti.membersCount; // Ensure currentRound doesn't exceed membersCount
      await kameti.save();
      console.log(`✅ Kameti ${kametiId} marked as Closed - all rounds finished`);
      return true;
    }
    return false;
  }
}

module.exports = PayoutService;

