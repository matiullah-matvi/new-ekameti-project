const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing login endpoint with 2FA user...\n');
    
    // Test with your email
    const response = await axios.post('http://localhost:5000/api/users/login', {
      email: 'matvi.matiullah@gmail.com',
      password: 'YOUR_PASSWORD_HERE' // Replace with your actual password
    });
    
    console.log('✅ Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.requiresTwoFactor) {
      console.log('\n✅ 2FA is working! Modal should appear.');
      console.log('UserId:', response.data.userId);
      console.log('Email:', response.data.email);
    } else {
      console.log('\n❌ 2FA NOT triggered - user logged in directly!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLogin();

