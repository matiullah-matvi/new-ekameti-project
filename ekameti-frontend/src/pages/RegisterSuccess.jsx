import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterSuccess = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Success Animation */}
          <div className="mb-6">
            <div className="relative w-24 h-24 mx-auto">
              {/* Outer Ring Animation */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-ping opacity-20"></div>
              
              {/* Main Circle */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Brand */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold">
              <span className="text-gray-900">e</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Kameti</span>
            </h1>
          </div>

          {/* Success Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              🎉 Welcome to eKameti!
            </h2>
            <p className="text-gray-600 mb-2">
              Your account has been successfully created and verified!
            </p>
            <p className="text-sm text-gray-500">
              Check your email for a welcome message from us.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Secure</h3>
              <p className="text-xs text-gray-600 mt-1">Bank-level security</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm">Trusted</h3>
              <p className="text-xs text-gray-600 mt-1">Community verified</p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center justify-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              What's Next?
            </h3>
            <ul className="space-y-2 text-left text-sm">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Login to your account</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Complete your profile</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">Create or join a Kameti</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <Link to="/" className="block">
            <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Go to Login
            </button>
          </Link>

          {/* Auto-redirect Notice */}
          <p className="mt-4 text-sm text-gray-500">
            Auto-redirecting in <span className="font-bold text-blue-600">{countdown}</span> seconds...
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Need help? <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-medium">Contact Support</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterSuccess;
