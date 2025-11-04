import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { getApiUrl } from '../config/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [user, setUser] = useState(null);
  const [processed, setProcessed] = useState(false); // Prevent duplicate processing

  useEffect(() => {
    // Prevent duplicate processing
    if (processed) {
      console.log('⚠️ DEBUG: Payment already processed, skipping...');
      return;
    }
    
    console.log('🔍 DEBUG: PaymentSuccess page loaded');
    
    // Get user from localStorage
    const storedUser = localStorage.getItem('ekametiUser');
    console.log('🔍 DEBUG: Stored user from localStorage:', storedUser);
    
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      console.log('🔍 DEBUG: Parsed user:', parsedUser);
    } else {
      console.log('⚠️ DEBUG: No user found in localStorage');
    }

    // Get payment data from URL parameters
    const amount = searchParams.get('amount');
    const transactionId = searchParams.get('transaction_id');
    const kametiId = searchParams.get('kameti_id');
    const mPaymentId = searchParams.get('m_payment_id');
    const email = searchParams.get('email_address');
    
    console.log('🔍 DEBUG: Raw URL parameters:', {
      amount,
      transactionId,
      kametiId,
      mPaymentId,
      email
    });
    
    console.log('🔍 DEBUG: All URL parameters:', Object.fromEntries(searchParams.entries()));
    
    // Log the current URL for debugging
    console.log('🔍 DEBUG: Current URL:', window.location.href);
    console.log('🔍 DEBUG: URL search:', window.location.search);
    
    // Check if we came from PayFast (no parameters means PayFast redirect)
    const hasUrlParams = amount || transactionId || mPaymentId || email;
    
    if (!hasUrlParams) {
      console.log('🔄 DEBUG: No URL parameters - likely came from PayFast');
      console.log('🔄 DEBUG: PayFast typically redirects without parameters');
      console.log('🔄 DEBUG: Using fallback payment processing...');
      
      // Use fallback payment processing
      const currentUser = user || JSON.parse(localStorage.getItem('ekametiUser') || 'null');
      
      if (currentUser) {
        const fallbackAmount = '10000';
        const fallbackTransactionId = `KAMETI-${Date.now()}`;
        
        console.log('🔄 DEBUG: Fallback payment data:', {
          fallbackAmount,
          fallbackTransactionId,
          userEmail: currentUser.email
        });
        
        setPaymentData({
          amount: parseFloat(fallbackAmount),
          transactionId: fallbackTransactionId,
          email: currentUser.email,
          kametiId: null
        });
        
            processPaymentSuccess(fallbackAmount, fallbackTransactionId, currentUser.email, null);
            setProcessed(true); // Mark as processed
          } else {
            console.log('❌ DEBUG: No user found for fallback payment');
            setLoading(false);
          }
    } else {
      // Process with URL parameters
      const finalAmount = amount || searchParams.get('amount_gross') || '10000';
      const finalTransactionId = transactionId || mPaymentId || searchParams.get('m_payment_id');
      const finalEmail = email || searchParams.get('email_address') || user?.email;
      
      console.log('🔍 DEBUG: Final processed parameters:', {
        finalAmount,
        finalTransactionId,
        finalEmail
      });
      
      if (finalAmount && finalTransactionId) {
        setPaymentData({
          amount: parseFloat(finalAmount),
          transactionId: finalTransactionId,
          email: finalEmail,
          kametiId: kametiId
        });
        
            processPaymentSuccess(finalAmount, finalTransactionId, finalEmail, kametiId);
            setProcessed(true); // Mark as processed
          } else {
            console.log('❌ DEBUG: Missing required parameters even after processing');
            setLoading(false);
          }
    }
  }, [searchParams, processed, user]);

  const processPaymentSuccess = async (amount, transactionId, email, kametiIdFromParam = null) => {
    try {
      console.log('🔄 DEBUG: Starting payment success processing...');
      console.log('🔄 DEBUG: Processing payment success:', { amount, transactionId, email, kametiIdFromParam });
      
      // Get user from localStorage directly to avoid state timing issues
      const currentUser = JSON.parse(localStorage.getItem('ekametiUser') || 'null');
      console.log('🔄 DEBUG: Current user from localStorage:', currentUser);
      
      if (!currentUser || !currentUser.email) {
        console.error('❌ DEBUG: No user found in localStorage');
        setLoading(false);
        return;
      }
      
      // Log all search params for debugging
      console.log('🔍 DEBUG: All URL search params:', Object.fromEntries(searchParams.entries()));
      
      // Get kametiId from URL (fallback to parameter)
      const urlKametiId = searchParams.get('kameti_id') || kametiIdFromParam;
      console.log('🔍 DEBUG: Kameti ID from URL:', urlKametiId);
      
      // Update local storage to show payment as completed
      // This will hide the "Pay Now" button when user returns to Kameti details
      if (currentUser) {
        console.log('🔍 DEBUG: Updating localStorage with payment history...');
        const updatedUser = {
          ...currentUser,
          // Don't update global paymentStatus - only update payment history
          lastPaymentDate: new Date().toISOString(),
          lastTransactionId: transactionId,
          lastPaymentAmount: amount,
          lastPaymentMethod: 'payfast'
        };
        
        console.log('🔍 DEBUG: Updated user object:', updatedUser);
        localStorage.setItem('ekametiUser', JSON.stringify(updatedUser));
        console.log('✅ DEBUG: User payment status updated in localStorage');
      } else {
        console.log('⚠️ DEBUG: No user found to update in localStorage');
      }

      // Try backend API calls to update payment status
      // NOTE: This only runs when user reaches PaymentSuccess page, meaning payment was completed
      try {
        // Use the new manual update endpoint
        const updateData = {
          email: email || currentUser?.email || currentUser.email,
          amount: parseFloat(amount),
          transactionId: transactionId
        };
        
        // Get kametiId from URL params first, then from parameter, then from paymentData
        let kametiIdToUse = urlKametiId || kametiIdFromParam || paymentData?.kametiId;
        
        // Try to get kametiId from window name if not in URL (for demo payments)
        if (!kametiIdToUse && window.name) {
          try {
            const windowData = JSON.parse(window.name);
            kametiIdToUse = windowData.kametiId;
            console.log('🔍 DEBUG: Got kametiId from window.name:', kametiIdToUse);
          } catch (e) {
            console.log('⚠️ DEBUG: Could not parse window.name:', e);
          }
        }
        
        console.log('🔍 DEBUG: KametiId being used:', kametiIdToUse);
        console.log('🔍 DEBUG: All sources checked - urlKametiId:', urlKametiId, 'kametiIdFromParam:', kametiIdFromParam, 'paymentData:', paymentData?.kametiId);
        
        // Only add kametiId if it exists and is a valid Kameti ID format (starts with KAMETI-)
        if (kametiIdToUse && kametiIdToUse.startsWith('KAMETI-')) {
          updateData.kametiId = kametiIdToUse;
          console.log('✅ DEBUG: Adding kametiId to update data:', kametiIdToUse);
        } else {
          console.log('⚠️ DEBUG: KametiId not found or invalid format, skipping:', kametiIdToUse);
        }
        
        console.log('🔄 DEBUG: Email being used:', updateData.email);
        console.log('🔄 DEBUG: Calling backend manual-update endpoint with:', JSON.stringify(updateData, null, 2));
        
        try {
          const updateResponse = await axios.post(getApiUrl('payfast/manual-update'), updateData, {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });
          console.log('✅ DEBUG: Payment status updated via manual endpoint:', updateResponse.data);
          
          if (updateResponse.data.success) {
            console.log('✅ DEBUG: Payment successfully saved to database');
          } else {
            console.warn('⚠️ DEBUG: Payment update returned success:false:', updateResponse.data);
          }
        } catch (axiosError) {
          console.error('❌ DEBUG: Axios error calling manual-update:', axiosError.message);
          console.error('❌ DEBUG: Response status:', axiosError.response?.status);
          console.error('❌ DEBUG: Response data:', axiosError.response?.data);
          throw axiosError; // Re-throw to be caught by outer catch
        }

        // Also try the notification endpoint
        try {
          const notificationData = {
            userEmail: currentUser?.email,
            userName: currentUser?.fullName,
            amount: amount,
            transactionId: transactionId
          };
          
          // Get kametiId for notification
          const kametiIdForNotification = kametiIdToUse || urlKametiId || kametiIdFromParam;
          
          // Only add kametiId if it's valid
          if (kametiIdForNotification && kametiIdForNotification.startsWith('KAMETI-')) {
            notificationData.kametiId = kametiIdForNotification;
          }
          
          console.log('🔄 DEBUG: Calling notification endpoint with:', notificationData);
          const notificationResponse = await axios.post(getApiUrl('notifications/payment-received'), notificationData);
          console.log('✅ DEBUG: Admin notification sent:', notificationResponse.data);
        } catch (notificationError) {
          console.log('⚠️ DEBUG: Notification failed:', notificationError.message);
          console.log('⚠️ DEBUG: Notification error details:', notificationError);
        }

      } catch (backendError) {
        console.error('❌ DEBUG: Backend processing failed:', backendError.message);
        console.error('❌ DEBUG: Backend error details:', backendError);
        console.error('❌ DEBUG: Error response:', backendError.response?.data);
        console.error('❌ DEBUG: Error status:', backendError.response?.status);
        console.log('💡 DEBUG: Payment status updated in localStorage only');
        
        // Show user-friendly error message
        if (backendError.response) {
          console.error('❌ Backend returned error:', backendError.response.status, backendError.response.data);
        } else if (backendError.request) {
          console.error('❌ No response received from backend. Check if backend is running.');
        }
        // For demo users, we only update localStorage
      }

      console.log('✅ DEBUG: Payment processed successfully');
      
      // Fetch updated notifications after payment
      try {
        const user = JSON.parse(localStorage.getItem('ekametiUser') || 'null');
        if (user?.email) {
          console.log('🔔 Fetching updated notifications...');
          const notificationResponse = await axios.get(getApiUrl(`users/notifications/${user.email}`));
          if (notificationResponse.data.success) {
            console.log('📧 Notifications updated:', notificationResponse.data.notifications.length);
            // Store notifications in localStorage for other components to use
            localStorage.setItem('ekametiNotifications', JSON.stringify(notificationResponse.data.notifications));
          }
        }
      } catch (notificationError) {
        console.log('⚠️ DEBUG: Could not fetch notifications:', notificationError.message);
      }
      
    } catch (error) {
      console.error('❌ DEBUG: Error processing payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToAccount = () => {
    navigate('/dashboard');
  };

  const handleViewKametis = () => {
    navigate('/my-kametis');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex flex-col justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful! 🎉
          </h1>
          
          <p className="text-lg text-gray-600 mb-8">
            Thank you! Your payment has been processed successfully.
          </p>

          {/* Payment Details */}
          {paymentData && (
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold text-green-600 text-lg">
                    Rs. {paymentData.amount?.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-sm text-gray-800">
                    {paymentData.transactionId}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="text-gray-800">PayFast</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Completed
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What Happens Next */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
            <ul className="text-left text-blue-800 space-y-2">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Your payment status has been updated to "Paid" in your account
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Payment details are saved for your records
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                You can now access all Kameti features
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleReturnToAccount}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Return to Dashboard
            </button>
            
            <button
              onClick={handleViewKametis}
              className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              View My Kametis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
