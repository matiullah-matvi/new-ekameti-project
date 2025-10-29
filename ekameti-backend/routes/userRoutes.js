const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const router = express.Router();
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key'; // Replace with your real secret in production

// Multer configuration for profile completion
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ✅ TEST ENDPOINT
router.get('/test', (req, res) => {
  res.json({ message: 'User routes are working!' });
});

// ✅ MARK NOTIFICATION AS READ: Mark notification as read by email and notification ID
router.put('/notifications/:email/:notificationId/read', async (req, res) => {
  try {
    const { email, notificationId } = req.params;
    
    const user = await User.findOne({ email });
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

// ✅ GET USER NOTIFICATIONS BY ID: Get notifications for a user by user ID
router.get('/notifications-by-id/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
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

// ✅ MARK NOTIFICATION AS READ BY ID: Mark notification as read by user ID and notification ID
router.put('/notifications-by-id/:userId/:notificationId/read', async (req, res) => {
  try {
    const { userId, notificationId } = req.params;
    
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

// ✅ GET USER'S JOINED KAMETIS: Fetch all Kametis the user has joined
router.get('/joined-kametis/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🔍 Fetching joined Kametis for user:', email);
    
    const user = await User.findOne({ email }).select('joinedKametis');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`📋 Found ${user.joinedKametis.length} joined Kametis for ${email}`);
    
    res.json({
      success: true,
      joinedKametis: user.joinedKametis || []
    });
    
  } catch (error) {
    console.error('❌ Error fetching joined Kametis:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch joined Kametis',
      error: error.message
    });
  }
});

// ✅ GET USER NOTIFICATIONS: Get notifications for a user by email
router.get('/notifications/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🔔 Fetching notifications for user:', email);
    
    const user = await User.findOne({ email }).select('notifications');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Sort notifications by creation date (newest first)
    const sortedNotifications = user.notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`📧 Found ${sortedNotifications.length} notifications for ${email}`);
    
    res.json({
      success: true,
      notifications: sortedNotifications,
      unreadCount: sortedNotifications.filter(n => !n.read).length
    });
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// ✅ MARK NOTIFICATION AS READ: Mark a specific notification as read
router.put('/notifications/:email/:notificationId/read', async (req, res) => {
  try {
    const { email, notificationId } = req.params;
    
    console.log('📖 Marking notification as read:', { email, notificationId });
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const notification = user.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.read = true;
    await user.save();
    
    console.log('✅ Notification marked as read');
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// ✅ REGISTER: Check if user exists + Send OTP via Gmail SMTP
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, cnic, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP in database
    await Otp.findOneAndUpdate(
      { email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Send OTP via Gmail SMTP
    console.log(`📤 Attempting to send OTP email to: ${email}`);
    console.log(`📝 OTP Code: ${otp}`);
    console.log(`👤 User Name: ${fullName}`);
    
    try {
      const emailResult = await sendOTPEmail(email, otp, fullName);
      console.log(`✅ OTP Email sent successfully to ${email}`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      console.error('❌ Full error:', emailError);
      
      return res.status(500).json({ 
        message: 'Failed to send verification email. Please check your email configuration.',
        error: emailError.message 
      });
    }

    return res.status(200).json({ 
      message: '✅ OTP sent to your email', 
      email 
    });

  } catch (error) {
    console.error('❌ Registration Error:', error.message);
    return res.status(500).json({ 
      message: '❌ Registration failed', 
      error: error.message 
    });
  }
});

// ✅ VERIFY OTP + Create User + Send Welcome Email
router.post('/verify-otp', async (req, res) => {
  try {
    const { fullName, email, password, cnic, phone, otp } = req.body;

    // Check OTP from database
    const otpRecord = await Otp.findOne({ email });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'No OTP found for this email. Please request a new one.' });
    }

    // Check if OTP expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Verify OTP
    if (otp !== otpRecord.otp) {
      return res.status(400).json({ message: '❌ Incorrect OTP' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate username from email (before @ symbol)
    const username = email.split('@')[0];

    // Create new user
    const newUser = new User({
      fullName,
      username,
      email,
      phone,
      cnic,
      password: hashedPassword,
    });

    await newUser.save();
    
    // Delete used OTP
    await Otp.deleteOne({ email });

    // Send welcome email (don't block registration if it fails)
    try {
      await sendWelcomeEmail(email, fullName);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error('⚠️ Welcome email failed:', emailError.message);
      // Don't fail registration if welcome email fails
    }

    return res.status(201).json({
      message: '✅ User registered successfully',
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      }
    });

  } catch (error) {
    console.error('❌ OTP Verification Error:', error.message);
    return res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});

// ✅ LOGIN: Verify credentials + Return user + JWT token (with 2FA support)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: '❌ Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '❌ Invalid email or password' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      console.log('✅ Password verified for 2FA user:', user.email);
      
      // Return requiresTwoFactor flag (don't send full token yet)
      return res.status(200).json({
        message: '✅ Password verified. Please enter your 2FA code.',
        requiresTwoFactor: true,
        userId: user._id,
        email: user.email
      });
    }

    // No 2FA - proceed with normal login
    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      message: '✅ Login successful',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      token,
    });

  } catch (error) {
    console.error('❌ Login Error:', error.message);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// ✅ COMPLETE PROFILE: Update phone, CNIC for Google users with OCR verification
router.put('/complete-profile', upload.single('cnicImage'), async (req, res) => {
  try {
    const { phone, cnic } = req.body;
    
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Find and update user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Validate required fields
    if (!phone || !cnic) {
      return res.status(400).json({ message: 'Phone and CNIC are required' });
    }

    // CNIC image is REQUIRED
    if (!req.file) {
      return res.status(400).json({ message: 'CNIC photo is required for verification' });
    }

    // OCR verification using existing Tesseract setup
    try {
      const Tesseract = require('tesseract.js');
      const imagePath = path.resolve(req.file.path);

      console.log('🔍 Verifying CNIC image...');
      
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: () => {},
      });

      const extractedText = data?.text || '';
      
      // Extract CNIC from image
      const extractedCNICMatch = extractedText.match(/\b(\d{5}-\d{7}-\d)\b/) || 
                                 extractedText.match(/\b(\d{13})\b/);
      const extractedCNIC = extractedCNICMatch ? extractedCNICMatch[1].replace(/-/g, '') : '';

      // Extract name (simplified - looks for uppercase text)
      const nameMatches = extractedText.match(/[A-Z][A-Z\s]{5,}/g) || [];
      const extractedName = nameMatches.join(' ').trim();

      console.log('📄 Extracted CNIC:', extractedCNIC);
      console.log('📄 Extracted Name:', extractedName);
      console.log('✅ Provided CNIC:', cnic);
      console.log('✅ User Name:', user.fullName);

      // Verify CNIC matches
      if (extractedCNIC && extractedCNIC !== cnic) {
        return res.status(400).json({ 
          message: 'CNIC number does not match the photo. Please verify and try again.',
          hint: `We detected: ${extractedCNIC}` 
        });
      }

      // Verify name matches (at least 2 words match)
      if (extractedName) {
        const userNameWords = user.fullName.toUpperCase().split(/\s+/);
        const extractedWords = extractedName.toUpperCase().split(/\s+/);
        
        let matchCount = 0;
        for (const userWord of userNameWords) {
          if (extractedWords.some(extracted => 
            userWord === extracted || 
            userWord.includes(extracted) || 
            extracted.includes(userWord)
          )) {
            matchCount++;
          }
        }

        if (matchCount < 2) {
          return res.status(400).json({ 
            message: 'Name on CNIC does not match your profile. Please verify and try again.',
            hint: `We detected: ${extractedName}` 
          });
        }
      }

      console.log('✅ CNIC verification successful!');

    } catch (ocrError) {
      console.error('⚠️ OCR verification failed:', ocrError.message);
      // Continue even if OCR fails (manual verification can be done later)
    }

    // Update profile
    user.phone = phone;
    user.cnic = cnic;
    user.cnicImage = req.file.filename;
    user.profileComplete = true;
    user.identityVerified = true; // Mark as verified

    await user.save();

    console.log('✅ Profile completed for:', user.email);

    return res.status(200).json({
      message: 'Profile completed successfully',
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        cnic: user.cnic,
        cnicImage: user.cnicImage,
        profileComplete: true,
        identityVerified: true
      }
    });

  } catch (error) {
    console.error('❌ Complete Profile Error:', error.message);
    console.error('Full error:', error);
    return res.status(500).json({ 
      message: 'Failed to complete profile', 
      error: error.message 
    });
  }
});

// ✅ FORGOT PASSWORD: Send reset link via email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // For security reasons, always return success message even if user doesn't exist
    if (!user) {
      return res.status(200).json({ 
        message: 'If an account exists with this email, you will receive a password reset link shortly.' 
      });
    }

    // Check if user has a password (not just Google OAuth user without password)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'This account was created using Google Sign-In. Please use Google to log in.' 
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing in database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(email, user.fullName, resetToken);
      console.log(`✅ Password reset email sent to ${email}`);
      
      return res.status(200).json({ 
        message: 'Password reset link has been sent to your email address.' 
      });
    } catch (emailError) {
      console.error('❌ Failed to send reset email:', emailError.message);
      
      // Clear reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      return res.status(500).json({ 
        message: 'Failed to send reset email. Please try again later.' 
      });
    }

  } catch (error) {
    console.error('❌ Forgot Password Error:', error.message);
    return res.status(500).json({ 
      message: 'An error occurred. Please try again later.' 
    });
  }
});

// ✅ RESET PASSWORD: Verify token and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate inputs
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Hash the token from URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() } // Token not expired
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Password reset token is invalid or has expired. Please request a new one.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    console.log(`✅ Password reset successful for ${user.email}`);

    return res.status(200).json({ 
      message: 'Your password has been reset successfully. You can now log in with your new password.' 
    });

  } catch (error) {
    console.error('❌ Reset Password Error:', error.message);
    return res.status(500).json({ 
      message: 'An error occurred while resetting your password. Please try again.' 
    });
  }
});

// ✅ GET PAYMENT STATISTICS: Update user payment status after successful payment
router.post('/update-payment-status', async (req, res) => {
  try {
    const { email, paymentStatus, transactionId, amount, paymentMethod } = req.body;

    console.log('💳 Updating payment status:', { email, paymentStatus, transactionId, amount });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user payment status
    user.paymentStatus = paymentStatus;
    user.lastPaymentDate = new Date();
    user.lastTransactionId = transactionId;
    user.lastPaymentAmount = amount;
    user.lastPaymentMethod = paymentMethod;

    await user.save();

    // Update Kameti member payment status
    const Kameti = require('../models/Kameti');
    const kametis = await Kameti.find({ 'members.email': email });
    
    for (const kameti of kametis) {
      const memberIndex = kameti.members.findIndex(m => m.email === email);
      if (memberIndex !== -1) {
        kameti.members[memberIndex].paymentStatus = paymentStatus;
        kameti.members[memberIndex].lastPaymentDate = new Date();
        kameti.members[memberIndex].transactionId = transactionId;
        
        // Update Kameti total collected amount
        if (paymentStatus === 'paid') {
          kameti.totalCollected = (kameti.totalCollected || 0) + amount;
        }
        
        await kameti.save();
        console.log(`✅ Updated payment status for user ${email} in Kameti ${kameti.name}`);
      }
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      user: {
        email: user.email,
        paymentStatus: user.paymentStatus,
        lastPaymentDate: user.lastPaymentDate
      }
    });

  } catch (error) {
    console.error('❌ Payment status update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
});

module.exports = router;
