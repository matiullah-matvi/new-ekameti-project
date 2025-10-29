const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const users = await User.find({}, 'email fullName twoFactorEnabled twoFactorVerified twoFactorSecret');
    
    console.log('📊 Users with 2FA status:\n');
    console.log('='.repeat(60));
    
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.fullName}`);
      console.log(`2FA Enabled: ${user.twoFactorEnabled}`);
      console.log(`2FA Verified: ${user.twoFactorVerified}`);
      console.log(`Has Secret: ${user.twoFactorSecret ? 'Yes' : 'No'}`);
      console.log('='.repeat(60));
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });


