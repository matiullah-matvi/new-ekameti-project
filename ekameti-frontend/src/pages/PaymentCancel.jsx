import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';

const PaymentCancel = () => {
  const navigate = useNavigate();

  const handleReturnToAccount = () => {
    navigate('/dashboard');
  };

  const handleTryAgain = () => {
    navigate('/my-kametis');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      {/* Cancel Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* Cancel Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          
          {/* Cancel Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Your payment was cancelled. No charges have been made to your account.
          </p>

          {/* What Happens Next */}
          <div className="bg-yellow-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">What happens next?</h3>
            <ul className="text-left text-yellow-800 space-y-2">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your payment status remains "Unpaid"
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                You can try making the payment again
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No penalty for cancelling the payment
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleTryAgain}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Payment Again
            </button>
            
            <button
              onClick={handleReturnToAccount}
              className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;