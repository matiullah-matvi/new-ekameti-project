const express = require('express');
const router = express.Router();
const Kameti = require('../models/Kameti');
const User = require('../models/User');
const authenticateUser = require('../middleware/authenticateUser');

async function ensureCreatorIsMember(kameti) {
  if (!kameti?.createdBy) return { changed: false, reason: 'no_createdBy' };

  const creatorIdStr = kameti.createdBy.toString();
  const creator = await User.findById(kameti.createdBy);
  if (!creator?.email) return { changed: false, reason: 'creator_not_found' };

  const alreadyMember = Array.isArray(kameti.members) && kameti.members.some(
    (m) =>
      (m.userId && m.userId.toString() === creatorIdStr) ||
      (m.email && m.email === creator.email)
  );
  if (alreadyMember) return { changed: false, reason: 'already_member' };

  kameti.members = Array.isArray(kameti.members) ? kameti.members : [];
  kameti.members.unshift({
    userId: creator._id,
    email: creator.email,
    name: creator.fullName || kameti.createdByName || 'Admin',
    joinedAt: kameti.createdAt || new Date(),
    paymentStatus: 'unpaid'
  });

  // ensure creator has this kameti in joinedKametis
  creator.joinedKametis = Array.isArray(creator.joinedKametis) ? creator.joinedKametis : [];
  const alreadyInUser = creator.joinedKametis.some(k => k.kametiId === kameti.kametiId);
  if (!alreadyInUser) {
    creator.joinedKametis.push({
      kametiId: kameti.kametiId,
      kametiName: kameti.name,
      joinedAt: new Date(),
      role: 'admin'
    });
    await creator.save();
  }

  await kameti.save();


  return { changed: true, reason: 'added' };
}

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
      payoutOrder,
      isPrivate,
      autoReminders,
      latePaymentFee,
      status,
      createdBy,
      createdByName,
    } = req.body;

    console.log('Incoming Kameti Request:', JSON.stringify(req.body, null, 2));
    const trimmedName = name?.trim();
    const trimmedDescription = description?.trim();
    
    if (!trimmedName || !trimmedDescription || !amount || !startDate || !membersCount) {
      const missing = [];
      if (!trimmedName) missing.push('name');
      if (!trimmedDescription) missing.push('description');
      if (!amount) missing.push('amount');
      if (!startDate) missing.push('startDate');
      if (!membersCount) missing.push('membersCount');
      
      console.error('Validation failed - Missing required fields:', {
        missing,
        received: {
          name: name ? `"${name}"` : 'null/undefined',
          description: description ? `"${description.substring(0, 50)}..."` : 'null/undefined',
          amount,
          startDate,
          membersCount
        }
      });
      
      return res.status(400).json({ 
        message: 'Missing required fields',
        missing,
        required: ['name', 'description', 'amount', 'startDate', 'membersCount']
      });
    }

    if (trimmedName.length < 3) {
      console.error('Validation failed - Name too short:', { length: trimmedName.length, name: trimmedName });
      return res.status(400).json({ message: 'Kameti name must be at least 3 characters' });
    }
    if (trimmedName.length > 100) {
      console.error('Validation failed - Name too long:', { length: trimmedName.length, name: trimmedName });
      return res.status(400).json({ message: 'Kameti name must not exceed 100 characters' });
    }

    if (trimmedDescription.length < 10) {
      console.error('Validation failed - Description too short:', { length: trimmedDescription.length });
      return res.status(400).json({ message: 'Description must be at least 10 characters' });
    }
    if (trimmedDescription.length > 500) {
      console.error('Validation failed - Description too long:', { length: trimmedDescription.length });
      return res.status(400).json({ message: 'Description must not exceed 500 characters' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 1000) {
      console.error('Validation failed - Invalid amount:', { amount, numericAmount, isNaN: isNaN(numericAmount) });
      return res.status(400).json({ message: 'Minimum contribution amount is Rs. 1,000' });
    }
    if (numericAmount > 1000000) {
      console.error('Validation failed - Amount too high:', { numericAmount });
      return res.status(400).json({ message: 'Maximum contribution amount is Rs. 1,000,000' });
    }

    const numericMembersCount = Number(membersCount);
    if (isNaN(numericMembersCount) || numericMembersCount < 2) {
      console.error('Validation failed - Invalid members count:', { membersCount, numericMembersCount, isNaN: isNaN(numericMembersCount) });
      return res.status(400).json({ message: 'Minimum 2 members required' });
    }
    if (numericMembersCount > 50) {
      console.error('Validation failed - Too many members:', { numericMembersCount });
      return res.status(400).json({ message: 'Maximum 50 members allowed' });
    }

    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      console.error('Validation failed - Invalid start date format:', { startDate, parsedDate: startDateObj });
      return res.status(400).json({ message: 'Invalid start date format' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(startDateObj);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      console.error('Validation failed - Start date in past:', { startDate, selectedDate, today });
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }
    
    // Maximum 1 year in future
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (selectedDate > maxDate) {
      console.error('Validation failed - Start date too far in future:', { startDate, selectedDate, maxDate });
      return res.status(400).json({ message: 'Start date cannot be more than 1 year in the future' });
    }

    const numericLateFee = latePaymentFee ? Number(latePaymentFee) : 0;
    if (latePaymentFee && (isNaN(numericLateFee) || numericLateFee < 0)) {
      console.error('Validation failed - Invalid late payment fee:', { latePaymentFee, numericLateFee });
      return res.status(400).json({ message: 'Late payment fee must be a positive number' });
    }
    if (numericLateFee > numericAmount) {
      console.error('Validation failed - Late fee exceeds amount:', { numericLateFee, numericAmount });
      return res.status(400).json({ message: 'Late payment fee cannot exceed contribution amount' });
    }

    if (createdBy) {
      const existingKameti = await Kameti.findOne({ 
        name: trimmedName, 
        createdBy: createdBy,
        status: { $in: ['Pending', 'Active'] }
      });
      if (existingKameti) {
        console.error('Validation failed - Duplicate kameti name:', { name: trimmedName, createdBy, existingKametiId: existingKameti._id });
        return res.status(400).json({ 
          message: 'You already have an active kameti with this name. Please choose a different name.' 
        });
      }
    }
    
    if (!createdBy) {
      console.error('Missing createdBy:', { createdBy, body: req.body });
      return res.status(400).json({ message: 'createdBy is required (creator must be the first member)' });
    }
    
    console.log('Looking up creator user with ID:', createdBy, typeof createdBy);
    let creatorUser = null;
    try {
      // Try to find by _id (handle both string and ObjectId)
      if (createdBy.length === 24 && /^[0-9a-fA-F]{24}$/.test(createdBy)) {
        creatorUser = await User.findById(createdBy);
      }
      if (!creatorUser) {
        creatorUser = await User.findOne({ _id: createdBy });
      }
    } catch (findError) {
      console.error('Error finding creator user:', findError.message);
      console.error('Creator ID:', createdBy, typeof createdBy);
    }
    
    if (!creatorUser?.email) {
      console.error('Creator user not found or invalid:', { createdBy, found: !!creatorUser });
      return res.status(400).json({ message: 'Invalid createdBy user. Creator must exist to create a kameti.' });
    }
    
    console.log('Creator user found:', { id: creatorUser._id, email: creatorUser.email, name: creatorUser.fullName });
    const validFrequencies = ['weekly', 'biweekly', 'monthly', 'quarterly'];
    const frequency = contributionFrequency || 'monthly';
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({ 
        message: `Invalid contribution frequency. Must be one of: ${validFrequencies.join(', ')}` 
      });
    }

    const validPayoutOrders = ['random', 'sequential', 'bidding', 'admin'];
    const payoutOrderValue = payoutOrder || 'random';
    if (!validPayoutOrders.includes(payoutOrderValue)) {
      return res.status(400).json({ 
        message: `Invalid payout order. Must be one of: ${validPayoutOrders.join(', ')}` 
      });
    }

    const autoRounds = numericMembersCount;

    const newKameti = new Kameti({
      name: trimmedName,
      description: trimmedDescription,
      amount: numericAmount,
      contributionFrequency: frequency,
      startDate: startDateObj,
      membersCount: numericMembersCount,
      round: `1 of ${autoRounds}`,
      currentRound: 1,
      payoutOrder: payoutOrderValue,
      isPrivate: isPrivate || false,
      autoReminders: autoReminders !== undefined ? autoReminders : true,
      latePaymentFee: numericLateFee,
      status: status || 'Pending',
      createdBy,
      createdByName,
      members: [{
        userId: creatorUser._id,
        email: creatorUser.email,
        name: creatorUser.fullName || createdByName || 'Admin',
        joinedAt: new Date(),
        paymentStatus: 'unpaid'
      }],
      totalCollected: 0,
      totalDisbursed: 0
    });

    await newKameti.save();
    
    const savedKameti = await Kameti.findById(newKameti._id);
    
    console.log('Kameti saved - Members array:', {
      kametiId: savedKameti.kametiId,
      membersLength: savedKameti.members?.length,
      members: savedKameti.members,
      createdBy: savedKameti.createdBy,
      creatorEmail: creatorUser.email
    });

    if (creatorUser) {
      if (!creatorUser.joinedKametis) creatorUser.joinedKametis = [];
      const already = creatorUser.joinedKametis.find(k => k.kametiId === newKameti.kametiId);
      if (!already) {
        creatorUser.joinedKametis.push({
          kametiId: newKameti.kametiId,
          kametiName: newKameti.name,
          joinedAt: new Date(),
          role: 'admin'
        });
        await creatorUser.save();
      }
    }
    
    console.log('Kameti created successfully:', savedKameti._id);
    console.log('Members in saved kameti:', savedKameti.members?.length, savedKameti.members);
    
    res.status(201).json({ 
      message: 'Kameti created successfully', 
      kameti: savedKameti 
    });
  } catch (error) {
    console.error('KAMETI CREATION ERROR:');
    console.error('Error Message:', error.message);
    console.error('Error Type:', error.name);
    console.error('Error Code:', error.code);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('Error Details:', JSON.stringify({
      name: error.name,
      code: error.code,
      errors: error.errors,
      message: error.message,
      path: error.path,
      value: error.value
    }, null, 2));
    
    if (error.code === 11000) {
      console.error('REASON: Duplicate key error (11000) - Kameti name already exists in database');
      return res.status(400).json({ 
        message: 'A kameti with this name already exists. Please choose a different name.',
        field: 'name'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      console.error('REASON: Mongoose validation error - Invalid data format');
      console.error('Validation Errors:', validationErrors);
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    if (error.name === 'CastError') {
      console.error('REASON: CastError - Invalid ObjectId format');
      console.error('Failed Field:', error.path);
      console.error('Invalid Value:', error.value);
      return res.status(400).json({ 
        message: `Invalid ${error.path}: ${error.value}. Please check your user ID.`,
        error: error.message
      });
    }
    
    console.error('REASON: Unknown error - Check stack trace above for details');
    
    res.status(500).json({ 
      message: 'Failed to create Kameti', 
      error: error.message 
    });
  }
});

// Get All Kametis
router.get('/', async (req, res) => {
  try {
    const kametis = await Kameti.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(kametis);
  } catch (error) {
    console.error('Error fetching all kametis:', error.message);
    res.status(500).json({ message: 'Failed to fetch kametis' });
  }
});

// Get Kametis created by a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const kametis = await Kameti.find({ createdBy: req.params.userId });
    res.status(200).json(kametis);
  } catch (error) {
    console.error('Failed to fetch Kametis:', error.message);
    res.status(500).json({ message: 'Failed to fetch Kametis' });
  }
});

router.post('/request-join/:id', async (req, res) => {
  try {
    const { userId, message } = req.body;

    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check kameti status
    if (kameti.status === 'Closed' || kameti.status === 'Completed' || kameti.status === 'Cancelled') {
      return res.status(400).json({ 
        message: `This kameti is ${kameti.status.toLowerCase()}. No new members can join.` 
      });
    }

    // Check if kameti is full
    if (kameti.members.length >= kameti.membersCount) {
      return res.status(400).json({ 
        message: 'Kameti is already full. Cannot accept more members.' 
      });
    }

    // Check if already a member (by email or userId)
    const alreadyMember = kameti.members.find(
      m => m.email === user.email || m.userId?.toString() === userId
    );
    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already a member of this kameti' });
    }

    // Check if request already exists (pending or approved)
    const existingRequest = kameti.joinRequests?.find(
      r => (r.email === user.email || r.userId?.toString() === userId) && 
           (r.status === 'pending' || r.status === 'approved')
    );
    if (existingRequest) {
      if (existingRequest.status === 'approved') {
        return res.status(400).json({ 
          message: 'Your join request was already approved. You should be a member.' 
        });
      }
      return res.status(400).json({ message: 'You have already sent a join request. Please wait for admin approval.' });
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
      console.log('Join request notification sent to admin');
    } catch (notificationError) {
      console.log('Failed to send join request notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: 'Join request sent successfully! Wait for admin approval.',
      kameti 
    });
  } catch (error) {
    console.error('Join request error:', error.message);
    // Return actionable reason to UI
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (error?.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid Kameti ID' });
    }
    return res.status(500).json({ message: error.message || 'Failed to send join request' });
  }
});

// Approve Join Request (Admin only)
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

    // Check if kameti is closed - prevent joining
    if (kameti.status === 'Closed') {
      return res.status(400).json({ 
        message: 'This kameti is closed. No new members can join.' 
      });
    }

    // Check if kameti is full before approving
    if (kameti.members.length >= kameti.membersCount) {
      return res.status(400).json({ 
        message: 'Cannot approve request. Kameti is already full.' 
      });
    }

    // Check if user is already a member
    const alreadyMember = kameti.members.find(
      m => m.email === request.email || m.userId?.toString() === request.userId?.toString()
    );
    if (alreadyMember) {
      // Remove duplicate request and return success
      kameti.joinRequests = kameti.joinRequests.filter(r => r._id.toString() !== request._id.toString());
      await kameti.save();
      return res.status(200).json({ 
        message: 'User is already a member',
        kameti 
      });
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
      console.log('User added to Kameti:', user.email, 'Kameti:', kameti.name);
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
      console.log('Join approval notification sent to user');
    } catch (notificationError) {
      console.log('Failed to send join approval notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: 'Join request approved!',
      kameti 
    });
  } catch (error) {
    console.error('Approve request error:', error.message);
    res.status(500).json({ message: 'Failed to approve request', error: error.message });
  }
});

// Reject Join Request (Admin only)
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
      console.log('Join rejection notification sent to user');
    } catch (notificationError) {
      console.log('Failed to send join rejection notification:', notificationError.message);
    }

    res.status(200).json({ 
      message: 'Join request rejected',
      kameti 
    });
  } catch (error) {
    console.error('Reject request error:', error.message);
    res.status(500).json({ message: 'Failed to reject request', error: error.message });
  }
});

router.post('/join/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check if kameti is closed - prevent joining
    if (kameti.status === 'Closed' || kameti.status === 'Completed' || kameti.status === 'Cancelled') {
      return res.status(400).json({ 
        message: `This kameti is ${kameti.status.toLowerCase()}. No new members can join.` 
      });
    }

    // Avoid duplicate join
    const alreadyJoined = kameti.members.find(m => m.email === user.email);
    if (alreadyJoined) {
      return res.status(400).json({ message: 'User already joined this Kameti' });
    }

    // Add user to Kameti members[]
    kameti.members.push({
      userId: user._id,
      email: user.email,
      name: user.fullName,
      paymentStatus: 'unpaid'
    });
    await kameti.save();

    // Save Kameti ID in user.kametiId
    user.kametiId = kameti._id;
    await user.save();

    // Find admin (creator) and send notification
    const admin = await User.findById(kameti.createdBy);
    if (admin) {
      const notification = {
        type: 'kameti_update',
        title: 'New Member Joined',
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
      console.log(`Admin notification sent to ${admin.email} about new member ${user.email}`);
    }

    res.status(200).json({ message: 'Joined Kameti successfully', kameti });
  } catch (error) {
    console.error('Join error:', error.message);
    res.status(500).json({ message: 'Failed to join Kameti', error: error.message });
  }
});

// Ignore/Cancel Kameti invite (Notify admin)
router.post('/ignore/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const kameti = await Kameti.findById(req.params.id);
    if (!kameti) return res.status(404).json({ message: 'Kameti not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find admin and send notification about ignore
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
      console.log(`Admin notification sent to ${admin.email} about declined invite from ${user.email}`);
    }

    res.status(200).json({ message: 'Declined to join Kameti', kameti });
  } catch (error) {
    console.error('Ignore error:', error.message);
    res.status(500).json({ message: 'Failed to process ignore', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Fetching Kameti details for ID:', id);
    
    // Try to find by MongoDB _id first, then by kametiId string
    let kameti = null;
    // Only try findById if it looks like a valid ObjectId (24 hex chars)
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        kameti = await Kameti.findById(id);
      } catch (err) {
        // If findById fails, fall through to findOne by kametiId
      }
    }
    if (!kameti) {
      // If not found by _id, try finding by kametiId string
      kameti = await Kameti.findOne({ kametiId: id });
    }
    
    if (!kameti) {
      return res.status(404).json({ message: 'Kameti not found' });
    }

    // ensure creator/admin is always a member (fixes old kametis too)
    const ensureResult = await ensureCreatorIsMember(kameti);
    
    // Reload from DB after ensureCreatorIsMember (in case it saved changes)
    // Use same lookup logic (try _id first, then kametiId)
    let finalKameti = null;
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      try {
        finalKameti = await Kameti.findById(id);
      } catch (err) {
        // If findById fails, fall through to findOne by kametiId
      }
    }
    if (!finalKameti) {
      finalKameti = await Kameti.findOne({ kametiId: id });
    }
    
    // Check and update completion status if needed (ensures status is always correct)
    if (finalKameti) {
      const PayoutService = require('../services/PayoutService');
      const wasUpdated = await PayoutService.checkAndUpdateCompletionStatus(finalKameti.kametiId);
      // Always reload to get the latest status (in case it was updated)
      const kametiIdForReload = finalKameti.kametiId;
      const mongoIdForReload = finalKameti._id;
      finalKameti = await Kameti.findById(mongoIdForReload);
      if (!finalKameti) {
        finalKameti = await Kameti.findOne({ kametiId: kametiIdForReload });
      }
      if (wasUpdated) {
        console.log(`Kameti status updated to Closed - reloaded from DB. New status: ${finalKameti.status}`);
      }
    }

    console.log('Kameti found:', {
      id: finalKameti._id,
      kametiId: finalKameti.kametiId,
      name: finalKameti.name,
      amount: finalKameti.amount,
      membersCount: finalKameti.members?.length || 0,
      members: finalKameti.members?.map(m => ({ email: m.email, name: m.name }))
    });
    
    res.json(finalKameti);
  } catch (error) {
    console.error('Error fetching Kameti details:', error.message);
    res.status(500).json({ message: 'Failed to fetch Kameti details', error: error.message });
  }
});

// Request Kameti Deletion (for non-closed kametis - requires member agreement)
router.post('/request-delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;

    // Find kameti
    let kameti = await Kameti.findById(id);
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId: id });
    }
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    // Verify user is the creator/admin
    if (kameti.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the kameti creator can request deletion' });
    }

    // If kameti is closed, allow direct deletion (no need for member agreement)
    if (kameti.status === 'Closed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Kameti is closed. Use the delete endpoint directly.' 
      });
    }

    // Check if there's already a pending delete request
    if (kameti.deleteRequest && kameti.deleteRequest.status === 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'A deletion request is already pending. Wait for all members to approve or cancel the existing request.' 
      });
    }

    // Get admin user info
    const User = require('../models/User');
    const admin = await User.findById(userId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    // Create delete request with member approvals list
    const memberApprovals = kameti.members.map(member => ({
      userId: member.userId,
      email: member.email,
      name: member.name,
      approved: false
    }));

    kameti.deleteRequest = {
      requestedBy: userId,
      requestedAt: new Date(),
      reason: reason || 'Admin requested kameti deletion',
      memberApprovals: memberApprovals,
      status: 'pending'
    };

    await kameti.save();

    console.log(`Delete request created for kameti ${kameti.kametiId} by ${admin.email}`);

    // Send notifications to all members about deletion request
    try {
      const axios = require('axios');
      const baseUrl = process.env.BACKEND_URL || process.env.API_URL || 'http://localhost:5000';
      
      for (const member of kameti.members) {
        if (member.userId && member.userId.toString() !== userId.toString()) {
          // Don't notify the admin who made the request
          try {
            await axios.post(`${baseUrl}/api/notifications/delete-request`, {
              userId: member.userId,
              userEmail: member.email,
              userName: member.name || member.email,
              kametiId: kameti.kametiId,
              kametiName: kameti.name,
              reason: reason || 'Admin requested kameti deletion',
              adminName: admin.fullName || admin.username || admin.email || 'Admin'
            });
            console.log(`Deletion request notification sent to ${member.email}`);
          } catch (notifError) {
            console.error(`Failed to send notification to ${member.email}:`, notifError.message);
          }
        }
      }
    } catch (notificationError) {
      console.error('Error sending deletion request notifications:', notificationError.message);
      // Don't fail the request if notifications fail
    }

    res.json({ 
      success: true, 
      message: 'Deletion request created. All members must approve before kameti can be deleted.',
      deleteRequest: kameti.deleteRequest
    });
  } catch (error) {
    console.error('Request delete error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create deletion request', 
      error: error.message 
    });
  }
});

// Approve/Reject Delete Request (Members only)
router.post('/approve-delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, approve } = req.body; // approve: true/false

    // Find kameti
    let kameti = await Kameti.findById(id);
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId: id });
    }
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    // Check if delete request exists
    if (!kameti.deleteRequest || kameti.deleteRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending deletion request found' 
      });
    }

    // Get user info
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find member approval entry
    const approvalIndex = kameti.deleteRequest.memberApprovals.findIndex(
      a => a.userId?.toString() === userId.toString() || a.email === user.email
    );

    if (approvalIndex === -1) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not a member of this kameti' 
      });
    }

    // Update approval
    kameti.deleteRequest.memberApprovals[approvalIndex].approved = approve === true;
    kameti.deleteRequest.memberApprovals[approvalIndex].approvedAt = new Date();

    // Check if all members approved
    const allApproved = kameti.deleteRequest.memberApprovals.every(a => a.approved === true);
    const hasRejection = kameti.deleteRequest.memberApprovals.some(a => a.approved === false);

    if (allApproved) {
      // All members approved - delete the kameti
      kameti.deleteRequest.status = 'approved';
      await kameti.save();
      
      // Delete the kameti
      await Kameti.findByIdAndDelete(kameti._id);
      
      console.log(`Kameti ${kameti.kametiId} deleted - all members approved`);

      res.json({ 
        success: true, 
        message: 'All members approved. Kameti has been deleted.',
        deleted: true
      });
    } else if (hasRejection && !approve) {
      // Someone rejected - cancel the request (requires ALL to agree, so any rejection cancels)
      kameti.deleteRequest.status = 'rejected';
      await kameti.save();
      
      console.log(`Deletion request cancelled - member rejected`);
      
      res.json({ 
        success: true, 
        message: 'Deletion request cancelled. All members must approve for deletion.',
        deleted: false
      });
    } else {
      // Still waiting for more approvals
      await kameti.save();
      
      const approvedCount = kameti.deleteRequest.memberApprovals.filter(a => a.approved).length;
      const totalCount = kameti.deleteRequest.memberApprovals.length;
      
      res.json({ 
        success: true, 
        message: `Your approval has been recorded. ${approvedCount}/${totalCount} members have approved. All members must approve for deletion.`,
        approvedCount,
        totalCount,
        deleted: false
      });
    }
  } catch (error) {
    console.error('Approve delete error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process approval', 
      error: error.message 
    });
  }
});

// Cancel Delete Request (Admin only)
router.post('/cancel-delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Find kameti
    let kameti = await Kameti.findById(id);
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId: id });
    }
    if (!kameti) {
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    // Verify user is the creator/admin
    if (kameti.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the kameti creator can cancel deletion request' });
    }

    // Check if delete request exists
    if (!kameti.deleteRequest || kameti.deleteRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'No pending deletion request found' 
      });
    }

    // Cancel the request
    kameti.deleteRequest.status = 'cancelled';
    await kameti.save();

    res.json({ 
      success: true, 
      message: 'Deletion request cancelled' 
    });
  } catch (error) {
    console.error('Cancel delete error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel deletion request', 
      error: error.message 
    });
  }
});

// Delete Kameti (Admin only, Closed kametis only - direct delete)
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body?.userId || req.query?.userId;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    console.log(`Delete request for kameti ${id} by user ${userId}`);

    // Find kameti by _id or kametiId
    let kameti = await Kameti.findById(id);
    if (!kameti) {
      kameti = await Kameti.findOne({ kametiId: id });
    }
    if (!kameti) {
      console.log(`Kameti not found: ${id}`);
      return res.status(404).json({ success: false, message: 'Kameti not found' });
    }

    console.log(`Found kameti: ${kameti.kametiId}, status: ${kameti.status}, createdBy: ${kameti.createdBy}`);

    // Verify user is the creator/admin
    if (kameti.createdBy.toString() !== userId.toString()) {
      console.log(`User ${userId} is not the creator. Creator is: ${kameti.createdBy}`);
      return res.status(403).json({ success: false, message: 'Only the kameti creator can delete it' });
    }

    // Only allow deletion of closed kametis (direct delete without member agreement)
    if (kameti.status !== 'Closed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only closed kametis can be deleted directly. For active kametis, use the deletion request system that requires all members to agree.' 
      });
    }

    // Delete the kameti
    await Kameti.findByIdAndDelete(kameti._id);
    
    console.log(`Kameti ${kameti.kametiId} deleted by admin ${userId}`);

    res.json({ 
      success: true, 
      message: 'Kameti deleted successfully' 
    });
  } catch (error) {
    console.error('Delete kameti error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete kameti', 
      error: error.message 
    });
  }
});

module.exports = router;
