const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No authentication token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// @route   POST /api/2fa/setup
// @desc    Generate 2FA secret and QR code
// @access  Private
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({ 
        message: '2FA is already enabled. Disable it first to set up again.' 
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `eKameti (${user.email})`,
      issuer: 'eKameti',
      length: 32
    });

    // Generate backup codes (10 codes)
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (not enabled until verified)
    user.twoFactorSecret = secret.base32;
    user.twoFactorBackupCodes = backupCodes;
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    
    await user.save();

    console.log('✅ 2FA setup initiated for:', user.email);

    return res.status(200).json({
      message: '2FA setup initiated. Please verify with your authenticator app.',
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: backupCodes,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    return res.status(500).json({ 
      message: 'Failed to set up 2FA', 
      error: error.message 
    });
  }
});

// @route   POST /api/2fa/verify-enable
// @desc    Verify TOTP code and enable 2FA
// @access  Private
router.post('/verify-enable', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ 
        message: 'Please initiate 2FA setup first' 
      });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds)
    });

    if (!verified) {
      return res.status(400).json({ 
        message: 'Invalid verification code. Please try again.' 
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    await user.save();

    console.log('✅ 2FA enabled for:', user.email);

    return res.status(200).json({
      message: '2FA has been successfully enabled!',
      twoFactorEnabled: true
    });

  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to verify and enable 2FA', 
      error: error.message 
    });
  }
});

// @route   POST /api/2fa/verify-login
// @desc    Verify 2FA code during login
// @access  Public (but requires temp token)
router.post('/verify-login', async (req, res) => {
  try {
    const { userId, token, backupCode } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    if (!token && !backupCode) {
      return res.status(400).json({ 
        message: 'Verification code or backup code is required' 
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    let verified = false;

    // Check backup code first
    if (backupCode) {
      const backupIndex = user.twoFactorBackupCodes.indexOf(backupCode.toUpperCase());
      
      if (backupIndex !== -1) {
        // Remove used backup code
        user.twoFactorBackupCodes.splice(backupIndex, 1);
        await user.save();
        verified = true;
        console.log('✅ 2FA verified with backup code for:', user.email);
      }
    } 
    // Check TOTP token
    else if (token) {
      verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (verified) {
        console.log('✅ 2FA verified with TOTP for:', user.email);
      }
    }

    if (!verified) {
      return res.status(400).json({ 
        message: 'Invalid verification code. Please try again.' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate full access JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: '2FA verification successful',
      token: jwtToken,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        profileComplete: user.isProfileComplete()
      }
    });

  } catch (error) {
    console.error('❌ 2FA login verification error:', error);
    return res.status(500).json({ 
      message: 'Failed to verify 2FA code', 
      error: error.message 
    });
  }
});

// @route   POST /api/2fa/disable
// @desc    Disable 2FA (requires password confirmation)
// @access  Private
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required to disable 2FA' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    user.twoFactorVerified = false;
    
    await user.save();

    console.log('✅ 2FA disabled for:', user.email);

    return res.status(200).json({
      message: '2FA has been successfully disabled',
      twoFactorEnabled: false
    });

  } catch (error) {
    console.error('❌ 2FA disable error:', error);
    return res.status(500).json({ 
      message: 'Failed to disable 2FA', 
      error: error.message 
    });
  }
});

// @route   GET /api/2fa/status
// @desc    Get 2FA status for current user
// @access  Private
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorVerified: user.twoFactorVerified,
      backupCodesCount: user.twoFactorBackupCodes?.length || 0
    });

  } catch (error) {
    console.error('❌ Get 2FA status error:', error);
    return res.status(500).json({ 
      message: 'Failed to get 2FA status', 
      error: error.message 
    });
  }
});

// @route   POST /api/2fa/regenerate-backup-codes
// @desc    Regenerate backup codes
// @access  Private
router.post('/regenerate-backup-codes', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    console.log('✅ Backup codes regenerated for:', user.email);

    return res.status(200).json({
      message: 'Backup codes regenerated successfully',
      backupCodes: backupCodes
    });

  } catch (error) {
    console.error('❌ Regenerate backup codes error:', error);
    return res.status(500).json({ 
      message: 'Failed to regenerate backup codes', 
      error: error.message 
    });
  }
});

module.exports = router;

