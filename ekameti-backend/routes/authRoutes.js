const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth login
// @access  Public
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:5173/?error=google-auth-failed',
    session: false 
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        {
          userId: req.user._id,
          email: req.user.email,
          username: req.user.username
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Update last login
      req.user.lastLogin = new Date();
      req.user.save();

      console.log('✅ Google login successful for:', req.user.email);

      // Check if profile is complete
      const profileComplete = req.user.isProfileComplete();

      // Redirect to frontend with token
      res.redirect(`http://localhost:5173/auth/google/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
        _id: req.user._id,
        fullName: req.user.fullName,
        username: req.user.username,
        email: req.user.email,
        profilePhoto: req.user.profilePhoto,
        profileComplete: profileComplete
      }))}`);
    } catch (error) {
      console.error('❌ Google callback error:', error);
      res.redirect('http://localhost:5173/?error=token-generation-failed');
    }
  }
);

// @route   GET /api/auth/logout
// @desc    Logout user
// @access  Public
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;

