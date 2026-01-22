const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authenticateUser');
const RiskAnalysisService = require('../services/RiskAnalysisService');
const Kameti = require('../models/Kameti');

// Get risk for current user
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const risk = await RiskAnalysisService.calculateUserRisk(userId);
    return res.json({ success: true, risk });
  } catch (error) {
    console.error('Risk /me error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate risk' });
  }
});

// Get risk for a specific user
router.get('/user/:userId', authenticateUser, async (req, res) => {
  try {
    const risk = await RiskAnalysisService.calculateUserRisk(req.params.userId);
    return res.json({ success: true, risk });
  } catch (error) {
    console.error('Risk /user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate risk' });
  }
});

// Batch risk for kameti members (creator/admin only)
router.get('/kameti/:kametiId', authenticateUser, async (req, res) => {
  try {
    const kameti = await Kameti.findOne({ kametiId: req.params.kametiId }).lean();
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    const requesterId = req.user.userId || req.user.id;
    if (kameti.createdBy?.toString() !== requesterId?.toString()) {
      return res.status(403).json({ success: false, message: 'Only the creator can view member risk' });
    }

    const memberRisks = [];
    for (const member of kameti.members || []) {
      if (!member.userId) continue;
      const risk = await RiskAnalysisService.calculateUserRisk(member.userId);
      memberRisks.push({
        userId: member.userId,
        email: member.email,
        name: member.name,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        recommendations: risk.recommendations,
      });
    }

    return res.json({ success: true, kametiId: kameti.kametiId, memberRisks });
  } catch (error) {
    console.error('Risk /kameti error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate kameti risk' });
  }
});

// Public (auth) kameti summary risk for users considering joining
router.get('/kameti-summary/:kametiId', authenticateUser, async (req, res) => {
  try {
    const { kametiId } = req.params;
    console.log('[risk] Request received for kameti-summary:', kametiId);
    const summary = await RiskAnalysisService.calculateKametiRiskSummary(kametiId);
    console.log('[risk] kameti-summary success', { kametiId, score: summary.riskScore, level: summary.riskLevel });
    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Risk /kameti-summary error:', {
      kametiId: req.params.kametiId,
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    const status = error.status || 500;
    return res.status(status).json({ success: false, message: error.message || 'Failed to calculate kameti summary' });
  }
});

module.exports = router;

