const express = require('express');
const router = express.Router();
const Otp = require('../models/Otp');
const { sendOTPEmail } = require('../services/emailService');

// ✅ Generate and send OTP via Mailgun
router.post('/send', async (req, res) => {
  const { email, userName } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
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

    // Send OTP via Mailgun
    await sendOTPEmail(email, otp, userName || 'User');

    console.log(`OTP sent to ${email}: ${otp}`); // Remove in production

    res.status(200).json({ 
      message: 'OTP sent successfully to your email',
      success: true
    });
  } catch (err) {
    console.error('OTP Send Error:', err);
    res.status(500).json({ 
      message: 'Failed to send OTP. Please try again.',
      error: err.message 
    });
  }
});

// ✅ Verify OTP
router.post('/verify', async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await Otp.findOne({ email });

    if (!record) return res.status(400).json({ message: 'OTP not found' });

    if (record.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Optional: delete OTP after success
    await Otp.deleteOne({ email });

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

module.exports = router;
