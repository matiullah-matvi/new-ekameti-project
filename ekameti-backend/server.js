//  server.js 
const express = require('express'); // Make sure this is at the top
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

//  Initialize Express App
const app = express();

// Early health check before any middleware
app.get('/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ status: 'ok', early: true, time: new Date().toISOString() });
});

//  Import Passport Config
const passport = require('./config/passport');

//  Import Models & Routes
const User = require('./models/User');
const kametiRoutes = require('./routes/kametiRoutes');
const userRoutes = require('./routes/userRoutes');
const otpRoutes = require('./routes/otpRoutes');
const payfastRoutes = require('./routes/payfastRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // ✅ Added
const ocrRoutes = require('./routes/ocrRoutes');
const authRoutes = require('./routes/authRoutes');
const twoFactorRoutes = require('./routes/twoFactorRoutes');

//  Middleware
// CORS configuration (development-friendly, env-driven)
const allowedOriginEnv = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
const isDev = (process.env.NODE_ENV || 'development') === 'development';
const corsOptions = {
  origin: (origin, callback) => {
    // In dev, allow any origin (including file:// and null origins) for easier testing
    if (isDev) return callback(null, true);
    // In non-dev, only allow the configured origin
    if (!origin || origin === allowedOriginEnv) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));
// Explicitly handle preflight for all routes (Express 5 safe)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Session middleware for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'ekameti-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

//  Multer for CNIC image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

//  Route Middlewares
app.use('/api/kameti', kametiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/payfast', payfastRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes); // ✅ Added
app.use('/api/ocr', ocrRoutes);
app.use('/api/auth', authRoutes); // Google OAuth routes
app.use('/api/2fa', twoFactorRoutes); // Two-Factor Authentication routes




// Root sanity check
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', root: true });
});
// Basic health check (useful for debugging CORS/preflight quickly)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});
// ❌ OLD REGISTER ROUTE - COMMENTED OUT (Now using /api/users/register with OTP)
/*
app.post('/api/register', upload.single('cnicImage'), async (req, res) => {
  try {
    const {
      fullName, username, email, password, confirmPassword,
      phone, cnic, agreeTerms
    } = req.body;

    // Enhanced Validation
    if (!agreeTerms) return res.status(400).json({ message: 'You must agree to terms' });
    if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

    // Identity Verification Functions
    const validateCNICFormat = (cnic) => {
      const cleanCNIC = cnic.replace(/[-\s]/g, '');
      if (!/^[0-9]{13}$/.test(cleanCNIC)) {
        return { valid: false, error: 'CNIC must be exactly 13 digits' };
      }
      
      // Basic format validation (simplified)
      // Check if it starts with valid region codes (1-9)
      const regionCode = parseInt(cleanCNIC.substring(0, 1));
      if (regionCode < 1 || regionCode > 9) {
        return { valid: false, error: 'Invalid CNIC region code' };
      }
      
      // Check if it's not all same digits
      if (/^(\d)\1{12}$/.test(cleanCNIC)) {
        return { valid: false, error: 'Invalid CNIC number' };
      }
      
      // Simplified validation - real CNIC checksum can be complex
      return { valid: true, cleanCNIC };
    };

    const validateNameCNICConsistency = (name, cnic) => {
      const nameParts = name.toLowerCase().trim().split(/\s+/);
      
      if (nameParts.length < 2) {
        return { valid: false, error: 'Please enter your full name (first name and last name)' };
      }
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /^[0-9]+$/, // All numbers
        /^[a-z]+[0-9]+$/, // Name followed by numbers
        /test|demo|sample|fake/i, // Test names
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(name)) {
          return { valid: false, error: 'Identity verification failed: Please enter a valid name' };
        }
      }
      
      return { valid: true };
    };

    const validatePhoneNumber = (phone) => {
      const cleanPhone = phone.replace(/[\s-]/g, '');
      if (!/^03[0-9]{9}$/.test(cleanPhone)) {
        return { valid: false, error: 'Phone number must start with 03 and be 11 digits' };
      }
      return { valid: true, cleanPhone };
    };

    // Enhanced Identity Verification
    const cnicValidation = validateCNICFormat(cnic);
    if (!cnicValidation.valid) {
      return res.status(400).json({ message: `❌ Identity verification failed: ${cnicValidation.error}` });
    }

    const nameValidation = validateNameCNICConsistency(fullName, cnic);
    if (!nameValidation.valid) {
      return res.status(400).json({ message: `❌ Identity verification failed: ${nameValidation.error}` });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return res.status(400).json({ message: `❌ Identity verification failed: ${phoneValidation.error}` });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: '❌ Email already exists' });

    // Check if CNIC already exists
    const existingCNIC = await User.findOne({ cnic: cnicValidation.cleanCNIC });
    if (existingCNIC) return res.status(400).json({ message: '❌ CNIC already registered with another account' });

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone: phoneValidation.cleanPhone });
    if (existingPhone) return res.status(400).json({ message: '❌ Phone number already registered with another account' });

    // Save new user with verified identity
    const newUser = new User({
      fullName,
      username,
      email,
      phone: phoneValidation.cleanPhone,
      password,
      confirmPassword,
      cnic: cnicValidation.cleanCNIC,
      cnicImage: req.file ? req.file.filename : '',
      identityVerified: true, // Mark as identity verified
      verificationDate: new Date()
    });

    await newUser.save();
    
    console.log('✅ User registered with verified identity:', {
      fullName,
      email,
      cnic: cnicValidation.cleanCNIC,
      phone: phoneValidation.cleanPhone
    });
    
    res.status(201).json({ 
      message: '✅ Account created successfully with verified identity!',
      user: {
        fullName: newUser.fullName,
        email: newUser.email,
        identityVerified: true
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ message: '❌ Registration failed', error: error.message });
  }
});
*/

// ❌ OLD LOGIN ROUTE - DEPRECATED (Now using /api/users/login with 2FA support)
// Kept for reference but should not be used
/*
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: '❌ User not found' });
    
    // Compare hashed password with plain text password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: '❌ Invalid password' });

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' } // token valid for 7 days
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: '✅ Login successful',
      token: token, // send token to frontend
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        cnic: user.cnic,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: '❌ Login failed', error: error.message });
  }
});
*/

// ✅ Payment Routes are now handled by payfastRoutes (registered above)

// ✅ Connect to DB & Start Server
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('❌ MONGO_URI environment variable is not defined. Please check your .env file.');
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10 // Maintain up to 10 socket connections
    });
    
    console.log('✅ MongoDB connected:', conn.connection.host);
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed through app termination');
  process.exit(0);
});

connectDB();
