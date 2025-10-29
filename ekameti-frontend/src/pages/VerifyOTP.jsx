import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/VerifyOTP.css'; // Make sure filename & path match

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!location.state) {
      navigate('/register'); // Redirect if no data
    }
  }, [location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Get registration data from localStorage
      const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');
      
      // Verify OTP and create user account
      const response = await axios.post('http://localhost:5000/api/users/verify-otp', {
        fullName: registrationData.fullName,
        email: location.state?.email || registrationData.email,
        password: registrationData.password,
        cnic: registrationData.cnic,
        phone: registrationData.phone,
        otp: otp
      });

      console.log('✅ Verification Success:', response.data);

      // Clear registration data
      localStorage.removeItem('registrationData');

      setMessage('✅ Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/register-success');
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'OTP verification failed');
      console.error('❌ Verification Error:', err.response?.data);
    }
  };

  return (
    <div className="verify-page">
      <h1 className="brand">e<span>Kameti</span></h1>
      <form className="verify-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <button type="submit">Verify</button>
        {message && <p className="error">{message}</p>}
      </form>
    </div>
  );
};

export default VerifyOTP;
