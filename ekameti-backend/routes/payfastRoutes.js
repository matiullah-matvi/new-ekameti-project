const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const PaymentService = require('../services/PaymentService');

// ✅ PayFast Sandbox Credentials (Your Account)
const PAYFAST_MERCHANT_ID = '10039586';
const PAYFAST_MERCHANT_KEY = '1tr4wsvtu7fjg';
const PAYFAST_PASSPHRASE = '2e27235d453c12352885f389d140ad68';
const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';

// ✅ Generate PayFast signature (PayFast Official Method)
const generatePayFastSignature = (params, passphrase = '') => {
  // Create a copy of params and remove signature field
  const paramsCopy = { ...params };
  delete paramsCopy.signature;

  // Remove empty values (PayFast requirement)
  Object.keys(paramsCopy).forEach(key => {
    if (paramsCopy[key] === '' || paramsCopy[key] === null || paramsCopy[key] === undefined) {
      delete paramsCopy[key];
    }
  });

  // Sort parameters alphabetically
  const sortedKeys = Object.keys(paramsCopy).sort();

  // Create parameter string
  const paramString = sortedKeys
    .map(key => {
      const value = paramsCopy[key];
      // PayFast requires URL encoding but with specific rules
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join('&');

  // Add passphrase
  const stringToSign = `${paramString}&passphrase=${passphrase}`;

  console.log('🔐 PayFast Signature Debug:');
  console.log('Original params:', params);
  console.log('Filtered params:', paramsCopy);
  console.log('Sorted keys:', sortedKeys);
  console.log('Parameter string:', paramString);
  console.log('String to sign:', stringToSign);

  // Generate MD5 hash
  const signature = crypto.createHash('md5').update(stringToSign).digest('hex');
  console.log('Generated signature:', signature);
  
  return signature;
};

// ✅ INITIATE PAYMENT: Create PayFast payment URL
router.post('/initiate', async (req, res) => {
  try {
    console.log('🔍 DEBUG: PayFast Initiate Request Received');
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Request headers:', req.headers);
    
    const {
      amount,
      item_name,
      item_description,
      user_email,
      user_name,
      kameti_id,
      return_url,
      cancel_url
    } = req.body;

    // Validate required fields
    if (!amount || !user_email || !user_name) {
      console.log('❌ DEBUG: Missing required fields:', { amount, user_email, user_name });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: amount, user_email, user_name'
      });
    }

    // ✅ Check if kameti is completed/closed - prevent payments
    if (kameti_id) {
      const Kameti = require('../models/Kameti');
      // Try to find by kametiId string first, then by MongoDB _id
      let kameti = await Kameti.findOne({ kametiId: kameti_id });
      if (!kameti && kameti_id.length === 24 && /^[0-9a-fA-F]{24}$/.test(kameti_id)) {
        kameti = await Kameti.findById(kameti_id);
      }
      
      if (kameti && kameti.status === 'Closed') {
        console.log('❌ Payment blocked: Kameti is closed');
        return res.status(400).json({
          success: false,
          message: 'This kameti is closed. No further payments are required.'
        });
      }
    }

        console.log('💳 DEBUG: Initiating PayFast payment:', { amount, item_name, user_email, kameti_id });
        console.log('🔍 DEBUG: Kameti ID type:', typeof kameti_id);
        console.log('🔍 DEBUG: Kameti ID length:', kameti_id?.length);
        console.log('🔍 DEBUG: Kameti ID value:', kameti_id);

    // Generate transaction ID (fixed: removed duplicate KAMETI prefix)
    const transactionId = `KAMETI-${kameti_id.replace('KAMETI-', '')}-${Date.now()}`;
    console.log('🔍 DEBUG: Generated transaction ID:', transactionId);
    
    // DON'T create payment record here - only when payment is actually completed
    // Payment records will be created in the IPN/notify endpoint or manual-update endpoint
    console.log('⚠️ Payment initiated - records will be created only on successful payment');

    // Build return URL with all necessary parameters
    const returnUrlParams = new URLSearchParams({
      amount: parseFloat(amount).toFixed(2),
      transaction_id: transactionId,
      kameti_id: kameti_id || ''
    });
    
    const cancelUrlParams = new URLSearchParams({
      kameti_id: kameti_id || ''
    });
    
    // Always add kameti_id to return URL, even if provided
    let finalReturnUrl;
    if (return_url) {
      // Parse existing URL and add parameters
      const url = new URL(return_url);
      returnUrlParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      finalReturnUrl = url.toString();
    } else {
      finalReturnUrl = `http://localhost:5173/payment-success?${returnUrlParams.toString()}`;
    }
    
    let finalCancelUrl;
    if (cancel_url) {
      const url = new URL(cancel_url);
      cancelUrlParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      finalCancelUrl = url.toString();
    } else {
      finalCancelUrl = `http://localhost:5173/payment-cancel?${cancelUrlParams.toString()}`;
    }
    
    console.log('🔍 DEBUG: Return URL with kameti_id:', finalReturnUrl);
    
    // PayFast parameters (all required fields)
    const payfastParams = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: finalReturnUrl,
      cancel_url: finalCancelUrl,
      notify_url: 'http://localhost:5000/api/payfast/notify',
      name_first: user_name?.split(' ')[0] || user_name,
      name_last: user_name?.split(' ').slice(1).join(' ') || '',
      email_address: user_email,
      m_payment_id: transactionId,
      amount: parseFloat(amount).toFixed(2),
      item_name: item_name,
      item_description: item_description || item_name,
      custom_str1: kameti_id || '',
      custom_str2: user_email || ''
    };
    
    console.log('🔍 DEBUG: PayFast parameters:', JSON.stringify(payfastParams, null, 2));

    // Generate PayFast signature (for production only)
    if (process.env.NODE_ENV === 'production') {
      const signature = generatePayFastSignature(payfastParams, PAYFAST_PASSPHRASE);
      payfastParams.signature = signature;
      console.log('✅ PayFast signature generated for production');
    } else {
      console.log('⚠️ Skipping signature generation for sandbox testing');
    }
    
    // Create query string (with or without signature)
    const queryString = Object.keys(payfastParams)
      .map(key => `${key}=${encodeURIComponent(payfastParams[key])}`)
      .join('&');

    const payfastUrl = `${PAYFAST_SANDBOX_URL}?${queryString}`;

    console.log('🔍 DEBUG: Query string:', queryString);
    console.log('🔍 DEBUG: Full PayFast URL:', payfastUrl);
    console.log('✅ DEBUG: PayFast URL generated successfully');

    const response = {
      success: true,
      paymentUrl: payfastUrl,
      transactionId: transactionId,
      parameters: payfastParams
    };
    
    console.log('🔍 DEBUG: Response being sent:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('❌ PayFast initiation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// ✅ IPN NOTIFICATION: Handle PayFast notifications
router.post('/notify', async (req, res) => {
  try {
    console.log('🔍 DEBUG: PayFast IPN/ITN Received');
    console.log('🔍 DEBUG: Request method:', req.method);
    console.log('🔍 DEBUG: Request headers:', req.headers);
    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 DEBUG: Request query:', req.query);
    console.log('🔍 DEBUG: Request params:', req.params);
    
    const ipnData = req.body;
    console.log('✅ DEBUG: PayFast IPN Data:', JSON.stringify(ipnData, null, 2));

    // Verify PayFast signature (for production only)
    if (process.env.NODE_ENV === 'production') {
      const signature = generatePayFastSignature(ipnData, PAYFAST_PASSPHRASE);
      if (signature !== ipnData.signature) {
        console.error('❌ Signature verification failed');
        return res.status(400).send('Invalid signature');
      }
      console.log('✅ PayFast signature verified');
    } else {
      console.log('⚠️ DEBUG: Skipping signature verification for sandbox testing');
    }

    // Check payment status
    console.log('🔍 DEBUG: Payment status:', ipnData.payment_status);
    if (ipnData.payment_status !== 'COMPLETE') {
      console.log('❌ DEBUG: Payment not complete:', ipnData.payment_status);
      return res.status(400).send('Payment not complete');
    }

    const email = ipnData.email_address;
    const amount = ipnData.amount_gross;
    const transactionId = ipnData.m_payment_id;

    console.log('🔍 DEBUG: Extracted data:', { email, amount, transactionId });
    console.log(`💰 DEBUG: Payment of Rs.${amount} received from ${email}`);

    // Create payment records ONLY when payment is actually completed
    console.log('🔍 DEBUG: Creating payment records for completed payment...');
    try {
      const User = require('../models/User');
      const Kameti = require('../models/Kameti');
      
      // Find user and kameti
      const user = await User.findOne({ email });
      const kametiId = ipnData.custom_str1;
      const kameti = await Kameti.findOne({ kametiId: kametiId });
      
      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(404).send('User not found');
      }
      
      if (!kameti) {
        console.log('❌ Kameti not found:', kametiId);
        return res.status(404).send('Kameti not found');
      }
      
      // Create payment records directly using models
      const Payment = require('../models/Payment');
      const PaymentRecord = require('../models/PaymentRecord');
      
      // Create Payment record
      const payment = new Payment({
        userId: user._id,
        userEmail: user.email,
        userName: user.fullName,
        kametiId: kametiId,
        kametiName: kameti.name,
        kametiMongoId: kameti._id,
        amount: parseFloat(amount),
        paymentMethod: 'payfast',
        transactionId: transactionId,
        status: 'completed',
        paymentCompletedAt: new Date(),
        fees: {
          gatewayFee: 0,
          platformFee: 0,
          netAmount: parseFloat(amount)
        },
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip || req.connection.remoteAddress,
          source: 'web' // Must be 'web', 'mobile', or 'api' per schema enum
        },
        auditTrail: [{
          action: 'payment_completed',
          details: { amount: parseFloat(amount), paymentMethod: 'payfast', transactionId },
          performedBy: 'system',
          timestamp: new Date()
        }]
      });
      
      try {
        await payment.save();
        console.log('✅ Payment record created in database:', payment.paymentId);
        console.log('✅ Payment saved with ID:', payment._id);
      } catch (saveError) {
        console.error('❌ ERROR saving Payment in IPN:', saveError.message);
        console.error('❌ Payment validation errors:', saveError.errors);
        throw saveError;
      }
      
      // Create PaymentRecord
      const paymentRecord = new PaymentRecord({
        kametiId: kametiId,
        kametiMongoId: kameti._id,
        userId: user._id,
        userEmail: user.email,
        round: kameti.currentRound || 1,
        totalRounds: kameti.membersCount,
        amount: parseFloat(amount),
        paymentMethod: 'payfast',
        transactionId: transactionId,
        paymentId: payment.paymentId,
        status: 'paid',
        dueDate: new Date(),
        paidAt: new Date(),
        metadata: {
          paymentGatewayResponse: ipnData,
          ipnData: ipnData
        }
      });
      
      try {
        await paymentRecord.save();
        console.log('✅ PaymentRecord created in database:', paymentRecord._id);
        console.log('✅ PaymentRecord saved with ID:', paymentRecord._id);
      } catch (saveError) {
        console.error('❌ ERROR saving PaymentRecord in IPN:', saveError.message);
        console.error('❌ PaymentRecord validation errors:', saveError.errors);
        throw saveError;
      }
      
      // Update Kameti member payment status
      await Kameti.updateOne(
        { kametiId: kametiId, "members.email": email },
        { 
          $set: { 
            "members.$.paymentStatus": "paid",
            "members.$.lastPaymentDate": new Date(),
            "members.$.transactionId": transactionId
          }
        }
      );
      
      console.log('✅ Kameti member status updated');
      
      // ✅ Send payment reminders to unpaid members
      try {
        const PaymentReminderService = require('../services/PaymentReminderService');
        await PaymentReminderService.sendPaymentReminders(kametiId);
      } catch (reminderError) {
        console.error('⚠️ Error sending payment reminders:', reminderError.message);
      }
      
      // ✅ Check if round is ready and notify admin
      try {
        const PayoutService = require('../services/PayoutService');
        const readiness = await PayoutService.checkRoundReadiness(kametiId);
        if (readiness.ready) {
          const PaymentReminderService = require('../services/PaymentReminderService');
          await PaymentReminderService.sendAdminRoundReadyNotification(kametiId);
          console.log('✅ Admin notified: Round is ready for payout');
        }
      } catch (readinessError) {
        console.error('⚠️ Error checking round readiness:', readinessError.message);
      }
      
      // Create payment notification
      const paymentNotification = {
        type: 'payment_received',
        title: '💰 Payment Received',
        message: `Payment of Rs.${amount} received successfully for Kameti "${kameti.name}"`,
        data: {
          amount: parseFloat(amount),
          transactionId: transactionId,
          paymentMethod: 'payfast',
          paymentStatus: 'completed',
          kametiId: kametiId,
          kametiName: kameti.name,
          timestamp: new Date()
        },
        read: false,
        createdAt: new Date()
      };
      
      // Add notification to admin
      const admin = await User.findById(kameti.createdBy);
      if (admin) {
        if (!admin.notifications) {
          admin.notifications = [];
        }
        admin.notifications.unshift(paymentNotification);
        await admin.save();
        console.log('✅ Payment notification sent to admin:', admin.email);
      }
      
      // Also add notification to user
      if (!user.notifications) {
        user.notifications = [];
      }
      user.notifications.unshift(paymentNotification);
      await user.save();
      
      console.log('✅ ALL PAYMENT RECORDS SAVED SUCCESSFULLY VIA IPN');
      
    } catch (error) {
      console.error('❌ Error creating payment records for completed payment:', error);
      // Fallback to old method
    }

    // Fallback: Update user payment status (old method)
    console.log('🔍 DEBUG: Starting fallback database update...');
    const User = require('../models/User');
    const Kameti = require('../models/Kameti');

    console.log('🔍 DEBUG: Looking for user with email:', email);
    
    // Create payment notification data
    const paymentNotification = {
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `Payment of Rs.${amount} received successfully for Kameti`,
      data: {
        amount: amount,
        transactionId: transactionId,
        paymentMethod: 'payfast',
        paymentStatus: 'COMPLETE',
        timestamp: new Date(),
        ipnData: ipnData
      },
      read: false,
      createdAt: new Date()
    };
    
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { 
        // Don't update global paymentStatus - only update specific Kameti member
        lastPaymentDate: new Date(),
        lastTransactionId: transactionId,
        lastPaymentAmount: amount,
        lastPaymentMethod: 'payfast',
        $push: { notifications: paymentNotification }
      },
      { new: true }
    );
    
    console.log('🔍 DEBUG: User update result:', updatedUser ? 'SUCCESS' : 'USER NOT FOUND');
    if (updatedUser) {
      console.log('👤 DEBUG: User payment history updated in DB:', updatedUser.email);
      console.log('🔍 DEBUG: Updated user data:', {
        email: updatedUser.email,
        lastTransactionId: updatedUser.lastTransactionId,
        lastPaymentAmount: updatedUser.lastPaymentAmount
      });
    } else {
      console.log('❌ DEBUG: No user found with email:', email);
    }

    // Update Kameti member status
    const kametiId = ipnData.custom_str1;
    console.log('🔍 DEBUG: Kameti ID from custom_str1:', kametiId);
    
    if (kametiId) {
      console.log('🔍 DEBUG: Updating Kameti member status...');
      const kametiResult = await Kameti.updateOne(
        { kametiId: kametiId, "members.email": email },
        { 
          $set: { 
            "members.$.paymentStatus": "paid",
            "members.$.lastPaymentDate": new Date(),
            "members.$.transactionId": transactionId
          }
        }
      );
      
      console.log('🔍 DEBUG: Kameti update result:', kametiResult);
      console.log('🔍 DEBUG: Kameti matched count:', kametiResult.matchedCount);
      console.log('🔍 DEBUG: Kameti modified count:', kametiResult.modifiedCount);
      
      if (kametiResult.matchedCount > 0) {
        console.log('🏷️ DEBUG: Kameti member status updated');
        
        // ✅ Send payment reminders to unpaid members
        try {
          const PaymentReminderService = require('../services/PaymentReminderService');
          await PaymentReminderService.sendPaymentReminders(kametiId);
        } catch (reminderError) {
          console.error('⚠️ Error sending payment reminders:', reminderError.message);
        }
        
        // ✅ Check if round is ready and notify admin
        try {
          const PayoutService = require('../services/PayoutService');
          const readiness = await PayoutService.checkRoundReadiness(kametiId);
          if (readiness.ready) {
            const PaymentReminderService = require('../services/PaymentReminderService');
            await PaymentReminderService.sendAdminRoundReadyNotification(kametiId);
            console.log('✅ Admin notified: Round is ready for payout');
          }
        } catch (readinessError) {
          console.error('⚠️ Error checking round readiness:', readinessError.message);
        }
      } else {
        console.log('❌ DEBUG: No Kameti member found to update');
      }
    } else {
      console.log('⚠️ DEBUG: No Kameti ID provided in custom_str1');
    }

    res.status(200).send('SUCCESS');

  } catch (error) {
    console.error('❌ IPN Error:', error.message);
    res.status(500).send('Server error');
  }
});

// ✅ MANUAL PAYMENT STATUS UPDATE: For when IPN doesn't work
router.post('/manual-update', async (req, res) => {
  try {
    console.log('🔍 DEBUG: Manual payment update request received');
    console.log('🔍 DEBUG: Request method:', req.method);
    console.log('🔍 DEBUG: Request headers:', req.headers);
    console.log('🔍 DEBUG: Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 DEBUG: Request query:', req.query);
    
    const { email, amount, transactionId, kametiId } = req.body;

    console.log('🔧 DEBUG: Manual payment status update:', { email, amount, transactionId, kametiId });

    if (!email || !amount || !transactionId) {
      console.error('❌ DEBUG: Missing required fields:', { email: !!email, amount: !!amount, transactionId: !!transactionId });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, amount, transactionId'
      });
    }
    
    // Check if payment already exists to prevent duplicates
    const Payment = require('../models/Payment');
    const existingPayment = await Payment.findOne({ transactionId });
    if (existingPayment) {
      console.log('⚠️ DEBUG: Payment already exists in database:', transactionId);
      return res.json({
        success: true,
        message: 'Payment already recorded',
        paymentId: existingPayment.paymentId,
        duplicate: true
      });
    }

    // Create payment records ONLY when payment is actually completed
    console.log('🔍 DEBUG: Creating payment records for completed manual payment...');
    
    const User = require('../models/User');
    const Kameti = require('../models/Kameti');
    // Payment already declared above (line 479)
    const PaymentRecord = require('../models/PaymentRecord');
    
    // Find user and kameti
    const user = await User.findOne({ email });
    const kameti = kametiId ? await Kameti.findOne({ kametiId: kametiId }) : null;
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('✅ User found:', user.email);
    console.log('✅ Kameti found:', kameti ? kameti.name : 'No Kameti');
    
    // Only create records if kameti exists
    if (kameti) {
      try {
        // Create Payment record directly
        const payment = new Payment({
          userId: user._id,
          userEmail: user.email,
          userName: user.fullName,
          kametiId: kametiId,
          kametiName: kameti.name,
          kametiMongoId: kameti._id,
          amount: parseFloat(amount),
          paymentMethod: 'payfast',
          transactionId: transactionId,
          status: 'completed',
          paymentCompletedAt: new Date(),
          fees: {
            gatewayFee: 0,
            platformFee: 0,
            netAmount: parseFloat(amount)
          },
          metadata: {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            source: 'web' // Must be 'web', 'mobile', or 'api' per schema enum
          },
          auditTrail: [{
            action: 'payment_completed',
            details: { amount: parseFloat(amount), paymentMethod: 'payfast', transactionId, source: 'manual_update' },
            performedBy: 'system',
            timestamp: new Date()
          }]
        });
        
        try {
          await payment.save();
          console.log('✅ Payment record created in database:', payment.paymentId);
          console.log('✅ Payment saved with ID:', payment._id);
          console.log('✅ Payment saved with paymentId:', payment.paymentId);
        } catch (saveError) {
          console.error('❌ ERROR saving Payment:', saveError.message);
          console.error('❌ Payment validation errors:', saveError.errors);
          console.error('❌ Payment save error stack:', saveError.stack);
          throw saveError; // Re-throw to be caught by outer catch
        }
        
        // Create PaymentRecord
        const paymentRecord = new PaymentRecord({
          kametiId: kametiId,
          kametiMongoId: kameti._id,
          userId: user._id,
          userEmail: user.email,
          round: 1,
          totalRounds: kameti.membersCount,
          amount: parseFloat(amount),
          paymentMethod: 'payfast',
          transactionId: transactionId,
          paymentId: payment.paymentId,
          status: 'paid',
          dueDate: new Date(),
          paidAt: new Date(),
          metadata: {
            paymentGatewayResponse: { source: 'manual_update' },
            ipnData: { source: 'manual_update' }
          }
        });
        
        try {
          await paymentRecord.save();
          console.log('✅ PaymentRecord created in database:', paymentRecord._id);
          console.log('✅ PaymentRecord saved with ID:', paymentRecord._id);
          console.log('✅ PaymentRecord saved with paymentId:', paymentRecord.paymentId);
        } catch (saveError) {
          console.error('❌ ERROR saving PaymentRecord:', saveError.message);
          console.error('❌ PaymentRecord validation errors:', saveError.errors);
          console.error('❌ PaymentRecord save error stack:', saveError.stack);
          throw saveError; // Re-throw to be caught by outer catch
        }
        
        // Update Kameti member payment status
        // First, check if user is a member
        const memberExists = kameti.members && kameti.members.some(m => m.email === email);
        console.log('🔍 DEBUG: Member exists in Kameti?', memberExists);
        console.log('🔍 DEBUG: Kameti members:', kameti.members?.map(m => ({ email: m.email, userId: m.userId })));
        
        if (memberExists) {
          const kametiUpdateResult = await Kameti.updateOne(
            { kametiId: kametiId, "members.email": email },
            { 
              $set: { 
                "members.$.paymentStatus": "paid",
                "members.$.lastPaymentDate": new Date(),
                "members.$.transactionId": transactionId
              }
            }
          );
          
          console.log('🔍 DEBUG: Kameti member update result:', kametiUpdateResult);
          if (kametiUpdateResult.matchedCount > 0) {
            console.log('✅ Kameti member status updated');
            
            // ✅ Send payment reminders to unpaid members
            try {
              const PaymentReminderService = require('../services/PaymentReminderService');
              await PaymentReminderService.sendPaymentReminders(kametiId);
            } catch (reminderError) {
              console.error('⚠️ Error sending payment reminders:', reminderError.message);
            }
            
            // ✅ Check if round is ready and notify admin
            try {
              const PayoutService = require('../services/PayoutService');
              const readiness = await PayoutService.checkRoundReadiness(kametiId);
              if (readiness.ready) {
                const PaymentReminderService = require('../services/PaymentReminderService');
                await PaymentReminderService.sendAdminRoundReadyNotification(kametiId);
                console.log('✅ Admin notified: Round is ready for payout');
              }
            } catch (readinessError) {
              console.error('⚠️ Error checking round readiness:', readinessError.message);
            }
          } else {
            console.warn('⚠️ Kameti member update matched 0 records');
          }
        } else {
          console.log('⚠️ User is not a member of this Kameti yet. Payment saved but member status not updated.');
          // Optionally, add user as a member if they're the creator
          if (kameti.createdBy && kameti.createdBy.toString() === user._id.toString()) {
            console.log('✅ User is the creator, adding as member...');
            if (!kameti.members) {
              kameti.members = [];
            }
            kameti.members.push({
              userId: user._id,
              email: user.email,
              userName: user.fullName,
              paymentStatus: 'paid',
              lastPaymentDate: new Date(),
              transactionId: transactionId,
              joinedAt: new Date()
            });
            await kameti.save();
            console.log('✅ Creator added as member with paid status');
          }
        }
        
        // Create payment notification with detailed information
        const paymentNotification = {
          type: 'payment_received',
          title: '💰 Payment Received',
          message: `Payment of Rs.${parseFloat(amount).toLocaleString()} received successfully for Kameti "${kameti.name}"`,
          data: {
            amount: parseFloat(amount),
            transactionId: transactionId,
            paymentMethod: 'payfast',
            paymentStatus: 'COMPLETE',
            kametiId: kametiId,
            kametiName: kameti.name,
            timestamp: new Date()
          },
          read: false,
          createdAt: new Date()
        };
        
        console.log('📧 DEBUG: Notification data:', JSON.stringify(paymentNotification, null, 2));
        
        // Add notification to admin's notifications
        const admin = await User.findById(kameti.createdBy);
        if (admin) {
          if (!admin.notifications) {
            admin.notifications = [];
          }
          admin.notifications.unshift(paymentNotification);
          await admin.save();
          console.log('✅ Payment notification sent to admin:', admin.email);
        }
        
        // Also add notification to user and update paymentStatus
        if (!user.notifications) {
          user.notifications = [];
        }
        user.notifications.unshift(paymentNotification);
        
        // Update user's paymentStatus to 'paid'
        user.paymentStatus = 'paid';
        user.lastPaymentDate = new Date();
        user.lastTransactionId = transactionId;
        user.lastPaymentAmount = parseFloat(amount);
        user.lastPaymentMethod = 'payfast';
        
        await user.save();
        console.log('✅ User paymentStatus updated to "paid"');
        console.log('✅ ALL PAYMENT RECORDS SAVED SUCCESSFULLY');
        
        return res.json({
          success: true,
          message: 'Payment records created and status updated successfully',
          paymentId: payment.paymentId,
          paymentRecordId: paymentRecord._id,
          user: {
            email: user.email,
            paymentStatus: user.paymentStatus,
            lastPaymentAmount: user.lastPaymentAmount,
            lastPaymentDate: user.lastPaymentDate
          }
        });
        
      } catch (error) {
        console.error('❌ Error creating payment records:', error);
        console.error('❌ Error stack:', error.stack);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        // Continue with fallback method
      }
    } else {
      console.log('⚠️ No Kameti found for Kameti ID:', kametiId);
      // Even if Kameti not found, still create payment record
      // Note: Payment model requires kametiMongoId, so we'll use a placeholder ObjectId
      // Payment already declared above (line 479)
      try {
        const mongoose = require('mongoose');
        const placeholderObjectId = new mongoose.Types.ObjectId();
        const payment = new Payment({
          userId: user._id,
          userEmail: user.email,
          userName: user.fullName,
          kametiId: kametiId || 'UNKNOWN',
          kametiName: 'Unknown Kameti',
          kametiMongoId: placeholderObjectId, // Placeholder since Kameti not found
          amount: parseFloat(amount),
          paymentMethod: 'payfast',
          transactionId: transactionId,
          status: 'completed',
          paymentCompletedAt: new Date(),
          fees: {
            gatewayFee: 0,
            platformFee: 0,
            netAmount: parseFloat(amount)
          },
          metadata: {
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            source: 'web' // Must be 'web', 'mobile', or 'api' per schema enum
          },
          auditTrail: [{
            action: 'payment_completed',
            details: { amount: parseFloat(amount), paymentMethod: 'payfast', transactionId, note: 'Kameti not found' },
            performedBy: 'system',
            timestamp: new Date()
          }]
        });
        
        try {
          await payment.save();
          console.log('✅ Payment record created (without Kameti):', payment.paymentId);
          console.log('✅ Payment saved with ID:', payment._id);
        } catch (saveError) {
          console.error('❌ ERROR saving Payment (without Kameti):', saveError.message);
          console.error('❌ Payment validation errors:', saveError.errors);
          throw saveError;
        }
        
        // Also update user paymentStatus
        user.paymentStatus = 'paid';
        user.lastPaymentDate = new Date();
        user.lastTransactionId = transactionId;
        user.lastPaymentAmount = parseFloat(amount);
        user.lastPaymentMethod = 'payfast';
        await user.save();
        console.log('✅ User paymentStatus updated to "paid" (without Kameti)');
      } catch (error) {
        console.error('❌ Error creating payment record without Kameti:', error);
        console.error('❌ Error details:', error.message);
      }
    }

    // Fallback: Update user payment history (old method)
    console.log('🔍 DEBUG: Starting fallback manual user update...');
    
    // Create payment notification data
    const paymentNotification = {
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `Payment of Rs.${amount} received successfully for Kameti`,
      data: {
        amount: amount,
        transactionId: transactionId,
        paymentMethod: 'payfast',
        paymentStatus: 'COMPLETE',
        timestamp: new Date(),
        kametiId: kametiId,
        source: 'manual_update'
      },
      read: false,
      createdAt: new Date()
    };
    
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { 
        // Update global paymentStatus to 'paid' for successful payment
        $set: {
          paymentStatus: 'paid',
          lastPaymentDate: new Date(),
          lastTransactionId: transactionId,
          lastPaymentAmount: parseFloat(amount),
          lastPaymentMethod: 'payfast'
        },
        $push: { notifications: paymentNotification }
      },
      { new: true }
    );

    console.log('🔍 DEBUG: Manual user update result:', updatedUser ? 'SUCCESS' : 'USER NOT FOUND');
    if (updatedUser) {
      console.log('👤 DEBUG: User payment history updated in DB:', updatedUser.email);
      console.log('🔍 DEBUG: Updated user data:', {
        email: updatedUser.email,
        paymentStatus: updatedUser.paymentStatus,
        lastTransactionId: updatedUser.lastTransactionId,
        lastPaymentAmount: updatedUser.lastPaymentAmount,
        lastPaymentDate: updatedUser.lastPaymentDate
      });
    } else {
      console.log('⚠️ DEBUG: User not found in DB:', email);
    }

    // Update Kameti member status if kametiId provided
    if (kametiId) {
      console.log('🔍 DEBUG: Updating Kameti member status manually...');
      console.log('🔍 DEBUG: Kameti ID:', kametiId);
      console.log('🔍 DEBUG: Kameti ID type:', typeof kametiId);
      console.log('🔍 DEBUG: Kameti ID length:', kametiId?.length);
      console.log('🔍 DEBUG: User email:', email);
      
      const kametiResult = await Kameti.updateOne(
        { kametiId: kametiId, "members.email": email },
        { 
          $set: { 
            "members.$.paymentStatus": "paid",
            "members.$.lastPaymentDate": new Date(),
            "members.$.transactionId": transactionId
          }
        }
      );
      
      console.log('🔍 DEBUG: Manual Kameti update result:', kametiResult);
      console.log('🔍 DEBUG: Kameti matched count:', kametiResult.matchedCount);
      console.log('🔍 DEBUG: Kameti modified count:', kametiResult.modifiedCount);
      
      if (kametiResult.matchedCount > 0) {
        console.log('🏷️ DEBUG: Kameti member status updated manually');
        
        // ✅ Send payment reminders to unpaid members
        try {
          const PaymentReminderService = require('../services/PaymentReminderService');
          await PaymentReminderService.sendPaymentReminders(kametiId);
        } catch (reminderError) {
          console.error('⚠️ Error sending payment reminders:', reminderError.message);
        }
        
        // ✅ Check if round is ready and notify admin
        try {
          const PayoutService = require('../services/PayoutService');
          const readiness = await PayoutService.checkRoundReadiness(kametiId);
          if (readiness.ready) {
            const PaymentReminderService = require('../services/PaymentReminderService');
            await PaymentReminderService.sendAdminRoundReadyNotification(kametiId);
            console.log('✅ Admin notified: Round is ready for payout');
          }
        } catch (readinessError) {
          console.error('⚠️ Error checking round readiness:', readinessError.message);
        }
      } else {
        console.log('❌ DEBUG: No Kameti member found to update manually');
      }
    } else {
      console.log('⚠️ DEBUG: No Kameti ID provided for manual update');
    }

    // Final response - always return success if we got this far
    console.log('✅ DEBUG: Manual payment update completed successfully');
    res.json({
      success: true,
      message: 'Payment status updated manually',
      user: updatedUser ? {
        email: updatedUser.email,
        lastTransactionId: updatedUser.lastTransactionId,
        lastPaymentAmount: updatedUser.lastPaymentAmount
      } : null,
      kametiId: kametiId || null,
      transactionId: transactionId
    });

  } catch (error) {
    console.error('❌ Manual payment update error:', error.message);
    console.error('❌ Full error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status manually',
      error: error.message
    });
  }
});

module.exports = router;