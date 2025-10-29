// Google OAuth Configuration using Passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, return user
          console.log('✅ Existing Google user found:', user.email);
          return done(null, user);
        }

        // Check if user exists with this email (link accounts)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.profilePhoto = user.profilePhoto || profile.photos[0]?.value;
          await user.save();
          console.log('✅ Linked Google account to existing user:', user.email);
          return done(null, user);
        }

        // Create new user from Google profile
        const newUser = new User({
          googleId: profile.id,
          fullName: profile.displayName,
          username: profile.emails[0].value.split('@')[0],
          email: profile.emails[0].value,
          profilePhoto: profile.photos[0]?.value,
          password: 'google-oauth-' + Math.random().toString(36), // Random password (not used)
          phone: '', // Will be added later by user
          identityVerified: true, // Google verified
          profileComplete: false, // Need to complete profile
        });

        await newUser.save();
        console.log('✅ New Google user created:', newUser.email);

        // Send welcome email (don't block if it fails)
        try {
          await sendWelcomeEmail(newUser.email, newUser.fullName);
          console.log('✅ Welcome email sent to:', newUser.email);
        } catch (emailError) {
          console.error('⚠️ Welcome email failed:', emailError.message);
        }

        done(null, newUser);
      } catch (error) {
        console.error('❌ Google OAuth Error:', error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;

