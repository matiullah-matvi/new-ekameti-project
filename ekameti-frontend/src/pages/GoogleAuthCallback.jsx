import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store token and user in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('ekametiUser', JSON.stringify(user)); // For compatibility

        console.log('✅ Google login successful!', user);

        // Check if profile is complete
        if (!user.profileComplete) {
          console.log('⚠️ Profile incomplete, redirecting to complete profile');
          setTimeout(() => {
            navigate('/complete-profile');
          }, 500);
        } else {
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard');
          }, 500);
        }
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
        navigate('/?error=invalid-response');
      }
    } else {
      console.error('❌ Missing token or user data');
      navigate('/?error=auth-failed');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-gray-600">Please wait while we complete your Google login</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;

