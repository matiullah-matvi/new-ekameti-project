const express = require('express');
const router = express.Router();
const Kameti = require('../models/Kameti');
const User = require('../models/User');
const authenticateUser = require('../middleware/authenticateUser'); // ✅ Middleware added

// ✅ Create Kameti - Enhanced Fields (temporarily without auth middleware for testing)
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      description,
      amount,
      contributionFrequency,
      startDate,
      membersCount,
      round,
      totalRounds,
      payoutOrder,
      isPrivate,
      autoReminders,
      latePaymentFee,
      status,
      createdBy,
      createdByName,
    } = req.body;

    console.log('📥 Incoming Kameti:', req.body);

    // validate required fields
    if (!name || !description || !amount || !startDate || !membersCount || !totalRounds) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'description', 'amount', 'startDate', 'membersCount', 'totalRounds']
      });
    }

    // validate business rules
    if (membersCount < 2) {
      return res.status(400).json({ message: 'Minimum 2 members required' });
    }

    if (totalRounds < 1) {
      return res.status(400).json({ message: 'At least 1 round required' });
    }

    // Note: Rounds can be different from members
    // Each round = one payout cycle where one member receives the pool
    // Multiple rounds mean members can receive payouts multiple times

    const newKameti = new Kameti({
      name,
      description,
      amount,
      contributionFrequency: contributionFrequency || 'monthly',
      startDate: new Date(startDate),
      membersCount,
      round: round || `1 of ${totalRounds}`,
      totalRounds,
      currentRound: 1,
      payoutOrder: payoutOrder || 'random',
      isPrivate: isPrivate || false,
      autoReminders: autoReminders !== undefined ? autoReminders : true,
      latePaymentFee: latePaymentFee || 0,
      status: status || 'Pending',
      createdBy,
      createdByName,
      members: [], // will be populated when users join
      totalCollected: 0,
      totalDisbursed: 0
    });

    await newKameti.save();
    
    console.log('✅ Kameti created successfully:', newKameti._id);
    
    res.status(201).json({ 
      message: '✅ Kameti created successfully', 
      kameti: newKameti 
    });
  } catch (error) {
    console.error('❌ Kameti creation error:', error.message);
    res.status(500).json({ 
      message: 'Failed to create Kameti', 
      error: error.message 
    });
  }
});

// ✅ Get All Kametis (for browse page)
router.get('/', async (req, res) => {
  try {
    const kametis = await Kameti.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(kametis);
  } catch (error) {
    console.error('Error fetching all kametis:', error.message);
    res.status(500).json({ message: 'Failed to fetch kametis' });
  }
});

// ✅ Get Kametis created by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const kametis = await Kameti.find({ createdBy: req.params.userId });
    res.status(200).json(kametis);
  } catch (error) {
    console.error('❌ Failed to fetch Kametis:', error.message);
    res.status(500).json({ message: 'Failed to fetch Kametis' });
  }
});

// ✅ Send Join Request to Kameti Admin
router.post('/request-join/:id', async (req, res) => {
  try {
    const { userId, message } = req.body;
    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // check if already a member
    const alreadyMember = kameti.members.find(m => m.email === user.email);
    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already a member of this kameti' });
    }

    // check if request already exists
    const existingRequest = kameti.joinRequests?.find(
      r => r.email === user.email && r.status === 'pending'
    );
    if (existingRequest) {
      return res.status(400).json({ message: 'You have already sent a join request' });
    }

    // add join request
    if (!kameti.joinRequests) {
      kameti.joinRequests = [];
    }
    
    kameti.joinRequests.push({
      userId: user._id,
      email: user.email,
      name: user.fullName,
      message: message || '',
      requestedAt: new Date(),
      status: 'pending'
    });

    await kameti.save();

    // Send notification to admin
    try {
      const axios = require('axios');
      await axios.post('http://localhost:5000/api/notifications/join-request', {
        userEmail: user.email,
        userName: user.fullName,
        kametiId: kameti.kametiId,
        kametiMongoId: kameti._id,
        kametiName: kameti.name,
        message: message || ''
      });
      console.log('✅ Join request notification sent to admin');
    } catch (notificationError) {
      console.log('⚠️ Failed to send join request notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: '✅ Join request sent successfully! Wait for admin approval.',
      kameti 
    });
  } catch (error) {
    console.error('❌ Join request error:', error.message);
    res.status(500).json({ message: 'Failed to send join request', error: error.message });
  }
});

// ✅ Approve Join Request (Admin only)
router.post('/approve-request/:kametiId/:requestId', async (req, res) => {
  try {
    const { kametiId, requestId } = req.params;
    const { adminId } = req.body;

    const kameti = await Kameti.findById(kametiId);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    // verify admin is the creator
    if (kameti.createdBy.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the kameti creator can approve requests' });
    }

    // find the join request
    const request = kameti.joinRequests?.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // check if kameti is full
    if (kameti.members.length >= kameti.membersCount) {
      return res.status(400).json({ message: 'Kameti is already full' });
    }

    // approve request - add to members
    kameti.members.push({
      userId: request.userId,
      email: request.email,
      name: request.name,
      joinedAt: new Date(),
      paymentStatus: 'unpaid'
    });

    // update request status
    request.status = 'approved';

    // update user's kameti list - add to user's joinedKametis array
    const user = await User.findById(request.userId);
    if (user) {
      // Add kameti to user's joinedKametis array if not already there
      if (!user.joinedKametis) {
        user.joinedKametis = [];
      }
      
      const alreadyJoined = user.joinedKametis.find(k => k.kametiId === kameti.kametiId);
      if (!alreadyJoined) {
        user.joinedKametis.push({
          kametiId: kameti.kametiId,
          kametiName: kameti.name,
          joinedAt: new Date(),
          role: 'member'
        });
      }
      
      await user.save();
      console.log('✅ User added to Kameti:', user.email, 'Kameti:', kameti.name);
    }

    await kameti.save();

    // Send notification to user about approval
    try {
      const axios = require('axios');
      await axios.post('http://localhost:5000/api/notifications/join-response', {
        userEmail: request.email,
        userName: request.name,
        kametiId: kameti.kametiId,
        kametiName: kameti.name,
        status: 'approved',
        adminMessage: 'Welcome to the Kameti!'
      });
      console.log('✅ Join approval notification sent to user');
    } catch (notificationError) {
      console.log('⚠️ Failed to send join approval notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: '✅ Join request approved!',
      kameti 
    });
  } catch (error) {
    console.error('❌ Approve request error:', error.message);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

// ✅ Reject Join Request (Admin only)
router.post('/reject-request/:kametiId/:requestId', async (req, res) => {
  try {
    const { kametiId, requestId } = req.params;
    const { adminId } = req.body;

    const kameti = await Kameti.findById(kametiId);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    // verify admin is the creator
    if (kameti.createdBy.toString() !== adminId) {
      return res.status(403).json({ message: 'Only the kameti creator can reject requests' });
    }

    // find the join request
    const request = kameti.joinRequests?.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Join request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // update request status
    request.status = 'rejected';
    await kameti.save();

    // Send notification to user about rejection
    try {
      const axios = require('axios');
      await axios.post('http://localhost:5000/api/notifications/join-response', {
        userEmail: request.email,
        userName: request.name,
        kametiId: kameti.kametiId,
        kametiName: kameti.name,
        status: 'rejected',
        adminMessage: 'Your join request has been rejected.'
      });
      console.log('✅ Join rejection notification sent to user');
    } catch (notificationError) {
      console.log('⚠️ Failed to send join rejection notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: '✅ Join request rejected',
      kameti 
    });
  } catch (error) {
    console.error('❌ Reject request error:', error.message);
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
});

// ✅ Join a Kameti (Direct join with admin notification)
router.post('/join/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Avoid duplicate join
    const alreadyJoined = kameti.members.find(m => m.email === user.email);
    if (alreadyJoined) {
      return res.status(400).json({ message: 'User already joined this Kameti' });
    }

    // ✅ 1. Add user to Kameti members[]
    kameti.members.push({
      userId: user._id,
      email: user.email,
      name: user.fullName,
      paymentStatus: 'unpaid'
    });
    await kameti.save();

    // ✅ 2. Save Kameti ID in user.kametiId
    user.kametiId = kameti._id;
    await user.save();

    // ✅ 3. Find admin (creator) and send notification
    const admin = await User.findById(kameti.createdBy);
    if (admin) {
      const notification = {
        type: 'kameti_update',
        title: '✅ New Member Joined',
        message: `${user.fullName} (${user.email}) has joined your Kameti "${kameti.name}"`,
        data: {
          kametiId: kameti.kametiId,
          kametiName: kameti.name,
          kametiMongoId: kameti._id,
          memberEmail: user.email,
          memberName: user.fullName,
          memberId: user._id,
          timestamp: new Date()
        },
        read: false,
        createdAt: new Date()
      };

      if (!admin.notifications) {
        admin.notifications = [];
      }
      admin.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (admin.notifications.length > 50) {
        admin.notifications = admin.notifications.slice(0, 50);
      }
      
      await admin.save();
      console.log(`✅ Admin notification sent to ${admin.email} about new member ${user.email}`);
    }

    res.status(200).json({ message: '✅ Joined Kameti successfully', kameti });
  } catch (error) {
    console.error('❌ Join error:', error.message);
    res.status(500).json({ message: 'Failed to join Kameti', error: error.message });
  }
});

// ✅ Ignore/Cancel Kameti invite (Notify admin)
router.post('/ignore/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Find admin and send notification about ignore
    const admin = await User.findById(kameti.createdBy);
    if (admin) {
      const notification = {
        type: 'kameti_update',
        title: '👋 Invite Declined',
        message: `${user.fullName} (${user.email}) has declined to join your Kameti "${kameti.name}"`,
        data: {
          kametiId: kameti.kametiId,
          kametiName: kameti.name,
          kametiMongoId: kameti._id,
          memberEmail: user.email,
          memberName: user.fullName,
          memberId: user._id,
          action: 'ignored',
          timestamp: new Date()
        },
        read: false,
        createdAt: new Date()
      };

      if (!admin.notifications) {
        admin.notifications = [];
      }
      admin.notifications.unshift(notification);
      
      // Keep only last 50 notifications
      if (admin.notifications.length > 50) {
        admin.notifications = admin.notifications.slice(0, 50);
      }
      
      await admin.save();
      console.log(`✅ Admin notification sent to ${admin.email} about declined invite from ${user.email}`);
    }

    res.status(200).json({ message: '✅ Declined to join Kameti', kameti });
  } catch (error) {
    console.error('❌ Ignore error:', error.message);
    res.status(500).json({ message: 'Failed to process ignore', error: error.message });
  }
});

// ✅ Get Kameti Details by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Fetching Kameti details for ID:', id);
    
    const kameti = await Kameti.findById(id);
    if (!kameti) {
      return res.status(404).json({ message: 'Kameti not found' });
    }
    
    console.log('✅ Kameti found:', {
      id: kameti._id,
      kametiId: kameti.kametiId,
      name: kameti.name,
      amount: kameti.amount,
      membersCount: kameti.members.length
    });
    
    res.json(kameti);
  } catch (error) {
    console.error('❌ Error fetching Kameti details:', error.message);
    res.status(500).json({ message: 'Failed to fetch Kameti details', error: error.message });
  }
});

module.exports = router;
