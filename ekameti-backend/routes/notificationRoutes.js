const express = require('express');
const router = express.Router();

// ✅ PAYMENT RECEIVED NOTIFICATION: Send notification to admin about payment
router.post('/payment-received', async (req, res) => {
  try {
    const { userEmail, userName, amount, transactionId, kametiId } = req.body;

    console.log('🔔 Payment notification:', { userEmail, userName, amount, transactionId, kametiId });

    // Find the Kameti and its admin (if kametiId provided)
    const Kameti = require('../models/Kameti');
    let kameti = null;
    let admin = null;
    
    if (kametiId) {
      // Find Kameti by kametiId (our unique ID) instead of MongoDB _id
      kameti = await Kameti.findOne({ kametiId: kametiId });
      if (kameti) {
        // Find admin user
        const User = require('../models/User');
        admin = await User.findById(kameti.createdBy);
        console.log('🔍 Found Kameti:', kameti.name, 'Admin:', admin?.email);
      }
    }
    
    // If no kameti found, just log the payment notification
    if (!kameti || !admin) {
      console.log('📧 Payment notification (no kameti/admin found):', {
        userEmail,
        userName,
        amount,
        transactionId
      });
      
      return res.json({
        success: true,
        message: 'Payment notification logged (no kameti/admin found)'
      });
    }

    // Create notification data
    const notification = {
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `${userName} (${userEmail}) has made a payment of Rs. ${amount.toLocaleString()} for Kameti "${kameti.name}"`,
      data: {
        kametiId: kametiId,
        kametiName: kameti.name,
        userEmail: userEmail,
        userName: userName,
        amount: amount,
        transactionId: transactionId,
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    // Add notification to admin's notifications array
    if (!admin.notifications) {
      admin.notifications = [];
    }
    
    admin.notifications.unshift(notification); // Add to beginning
    
    // Keep only last 50 notifications
    if (admin.notifications.length > 50) {
      admin.notifications = admin.notifications.slice(0, 50);
    }
    
    await admin.save();

    console.log(`✅ Notification sent to admin ${admin.email} about payment from ${userEmail}`);

    res.json({
      success: true,
      message: 'Notification sent to admin successfully',
      notification: notification
    });

  } catch (error) {
    console.error('❌ Notification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

// ✅ GET NOTIFICATIONS: Get notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      notifications: user.notifications || [],
      unreadCount: (user.notifications || []).filter(n => !n.read).length
    });

  } catch (error) {
    console.error('❌ Get notifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
});

// ✅ MARK NOTIFICATION AS READ: Mark notification as read
router.put('/mark-read/:userId/:notificationId', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find and mark notification as read
    const notification = user.notifications.find(n => n._id.toString() === notificationId);
    if (notification) {
      notification.read = true;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('❌ Mark notification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// ✅ JOIN REQUEST NOTIFICATION: Notify admin about join requests
router.post('/join-request', async (req, res) => {
  try {
    const { userEmail, userName, kametiId, kametiMongoId, kametiName, message } = req.body;

    console.log('🔔 Join request notification:', { userEmail, userName, kametiId, kametiMongoId, kametiName });

    // Find the Kameti and its admin
    const Kameti = require('../models/Kameti');
    const User = require('../models/User');
    
    const kameti = await Kameti.findOne({ kametiId: kametiId });
    if (!kameti) {
      return res.status(404).json({
        success: false,
        message: 'Kameti not found'
      });
    }

    const admin = await User.findById(kameti.createdBy);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    console.log('🔍 Found Kameti:', kameti.name, 'Admin:', admin.email);

    // Create notification data
    const notification = {
      type: 'join_request',
      title: '👥 New Join Request',
      message: `${userName} (${userEmail}) wants to join Kameti "${kametiName}"`,
      data: {
        userEmail,
        userName,
        kametiId,
        kametiMongoId: kametiMongoId || kameti._id,
        kametiName,
        message: message || '',
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    // Add notification to admin's notifications array
    admin.notifications.push(notification);
    await admin.save();

    console.log('✅ Join request notification sent to admin:', admin.email);

    res.json({ 
      success: true, 
      message: 'Join request notification sent to admin',
      adminEmail: admin.email
    });

  } catch (error) {
    console.error('❌ Error sending join request notification:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send join request notification',
      error: error.message
    });
  }
});

// ✅ JOIN REQUEST RESPONSE NOTIFICATION: Notify user about join request approval/rejection
router.post('/join-response', async (req, res) => {
  try {
    const { userEmail, userName, kametiId, kametiName, status, adminMessage } = req.body;

    console.log('🔔 Join response notification:', { userEmail, userName, kametiId, status });

    // Find the user
    const User = require('../models/User');
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create notification data
    const notification = {
      type: status === 'approved' ? 'request_approved' : 'request_rejected',
      title: status === 'approved' ? '✅ Join Request Approved' : '❌ Join Request Rejected',
      message: status === 'approved' 
        ? `Your request to join Kameti "${kametiName}" has been approved!`
        : `Your request to join Kameti "${kametiName}" has been rejected.`,
      data: {
        kametiId,
        kametiName,
        status,
        adminMessage: adminMessage || '',
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    // Add notification to user's notifications array
    user.notifications.push(notification);
    await user.save();

    console.log('✅ Join response notification sent to user:', user.email);

    res.json({ 
      success: true, 
      message: 'Join response notification sent to user',
      userEmail: user.email
    });

  } catch (error) {
    console.error('❌ Error sending join response notification:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send join response notification',
      error: error.message
    });
  }
});

// ✅ DELETE REQUEST NOTIFICATION: Notify members about deletion request
router.post('/delete-request', async (req, res) => {
  try {
    const { userId, userEmail, userName, kametiId, kametiName, reason, adminName } = req.body;

    console.log('🔔 Delete request notification:', { userEmail, userName, kametiId, kametiName });

    // Find the user
    const User = require('../models/User');
    const user = userId ? await User.findById(userId) : await User.findOne({ email: userEmail });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create notification data
    const notification = {
      type: 'delete_request',
      title: '⚠️ Kameti Deletion Request',
      message: `${adminName || 'Admin'} has requested to delete Kameti "${kametiName}". Your approval is required.`,
      data: {
        kametiId,
        kametiName,
        reason: reason || '',
        adminName: adminName || 'Admin',
        timestamp: new Date()
      },
      read: false,
      createdAt: new Date()
    };

    // Add notification to user's notifications array
    if (!user.notifications) {
      user.notifications = [];
    }
    user.notifications.unshift(notification);
    
    // Keep only last 50 notifications
    if (user.notifications.length > 50) {
      user.notifications = user.notifications.slice(0, 50);
    }

    await user.save();

    console.log('✅ Delete request notification sent to user:', user.email);

    res.json({ 
      success: true, 
      message: 'Delete request notification sent to user',
      userEmail: user.email
    });

  } catch (error) {
    console.error('❌ Error sending delete request notification:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send delete request notification',
      error: error.message
    });
  }
});

module.exports = router;
