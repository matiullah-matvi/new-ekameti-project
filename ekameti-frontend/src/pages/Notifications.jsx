// Notifications page - view all notifications including payment notifications
// Shows payment notifications, join requests, and other system notifications

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('ekametiUser') || 'null');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      if (!user?.email) {
        console.log('No user email found');
        setLoading(false);
        return;
      }

      console.log('🔔 Fetching notifications for:', user.email);
      
      // Fetch payment notifications from our new API
      const response = await axios.get(getApiUrl(`users/notifications/${user.email}`));
      
      if (response.data.success) {
        setNotifications(response.data.notifications);
        setUnreadCount(response.data.unreadCount);
        console.log('📧 Notifications loaded:', response.data.notifications.length);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      if (!user?.email) return;

      await axios.put(getApiUrl(`users/notifications/${user.email}/${notificationId}/read`));
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const handleApproveRequest = async (notification) => {
    try {
      console.log('✅ Approving join request:', notification);
      
      if (!notification.data) {
        console.error('❌ Missing notification data');
        alert('Error: Missing notification data');
        return;
      }

      let kameti;
      
      // If kametiMongoId exists, use it directly
      if (notification.data.kametiMongoId) {
        console.log('🔍 Using kametiMongoId:', notification.data.kametiMongoId);
        const kametiResponse = await axios.get(`kameti/${notification.data.kametiMongoId}`);
        kameti = kametiResponse.data;
      } 
      // Otherwise, find by kametiId (for older notifications)
      else if (notification.data.kametiId) {
        console.log('🔍 Fetching all kametis to find by kametiId:', notification.data.kametiId);
        const allKametisResponse = await axios.get(getApiUrl('kameti'));
        kameti = allKametisResponse.data.find(k => k.kametiId === notification.data.kametiId);
        
        if (!kameti) {
          console.error('❌ Kameti not found with kametiId:', notification.data.kametiId);
          alert('Kameti not found');
          return;
        }
      } else {
        console.error('❌ Missing kameti information in notification');
        alert('Error: Missing Kameti information');
        return;
      }
      
      if (!kameti || !kameti.joinRequests) {
        console.error('❌ No join requests found');
        alert('No join requests found');
        return;
      }

      // Find the pending join request
      const joinRequest = kameti.joinRequests.find(req => 
        req.email === notification.data.userEmail && req.status === 'pending'
      );

      if (!joinRequest) {
        console.error('❌ Join request not found or already processed');
        alert('This join request has already been processed');
        return;
      }

      const requestId = joinRequest._id;
      const kametiId = kameti._id;

      console.log('📤 Sending approve request:', { kametiId, requestId, adminId: user._id });
      
      // Call approve endpoint
      const response = await axios.post(
        getApiUrl(`kameti/approve-request/${kametiId}/${requestId}`),
        { adminId: user._id }
      );

      console.log('✅ Join request approved:', response.data);
      
      // Mark notification as read
      await markAsRead(notification._id);
      
      // Remove notification from list
      setNotifications(prev => prev.filter(n => n._id !== notification._id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      alert('✅ Join request approved! The user has been added to the Kameti.');
    } catch (error) {
      console.error('❌ Error approving join request:', error);
      alert(error.response?.data?.message || 'Failed to approve join request');
    }
  };

  const handleRejectRequest = async (notification) => {
    try {
      console.log('❌ Rejecting join request:', notification);
      
      if (!notification.data) {
        console.error('❌ Missing notification data');
        alert('Error: Missing notification data');
        return;
      }

      let kameti;
      
      // If kametiMongoId exists, use it directly
      if (notification.data.kametiMongoId) {
        console.log('🔍 Using kametiMongoId:', notification.data.kametiMongoId);
        const kametiResponse = await axios.get(`kameti/${notification.data.kametiMongoId}`);
        kameti = kametiResponse.data;
      } 
      // Otherwise, find by kametiId (for older notifications)
      else if (notification.data.kametiId) {
        console.log('🔍 Fetching all kametis to find by kametiId:', notification.data.kametiId);
        const allKametisResponse = await axios.get(getApiUrl('kameti'));
        kameti = allKametisResponse.data.find(k => k.kametiId === notification.data.kametiId);
        
        if (!kameti) {
          console.error('❌ Kameti not found with kametiId:', notification.data.kametiId);
          alert('Kameti not found');
          return;
        }
      } else {
        console.error('❌ Missing kameti information in notification');
        alert('Error: Missing Kameti information');
        return;
      }
      
      if (!kameti || !kameti.joinRequests) {
        console.error('❌ No join requests found');
        alert('No join requests found');
        return;
      }

      // Find the pending join request
      const joinRequest = kameti.joinRequests.find(req => 
        req.email === notification.data.userEmail && req.status === 'pending'
      );

      if (!joinRequest) {
        console.error('❌ Join request not found or already processed');
        alert('This join request has already been processed');
        return;
      }

      const requestId = joinRequest._id;
      const kametiId = kameti._id;

      console.log('📤 Sending reject request:', { kametiId, requestId, adminId: user._id });
      
      // Call reject endpoint
      const response = await axios.post(
        getApiUrl(`kameti/reject-request/${kametiId}/${requestId}`),
        { adminId: user._id }
      );

      console.log('✅ Join request rejected:', response.data);
      
      // Mark notification as read
      await markAsRead(notification._id);
      
      // Remove notification from list
      setNotifications(prev => prev.filter(n => n._id !== notification._id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      alert('❌ Join request rejected.');
    } catch (error) {
      console.error('❌ Error rejecting join request:', error);
      alert(error.response?.data?.message || 'Failed to reject join request');
    }
  };


  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString()}`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment_received':
        return '💰';
      case 'join_request':
        return '👥';
      case 'request_approved':
        return '✅';
      case 'request_rejected':
        return '❌';
      case 'kameti_update':
        return '📢';
      default:
        return '🔔';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5z" />
                </svg>
                <p className="mt-2">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-6 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getNotificationIcon(notification.type)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            New
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-gray-600 ml-11">{notification.message}</p>
                      
                      {notification.data && notification.type === 'payment_received' && (
                        <div className="mt-3 ml-11 bg-green-50 border border-green-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Details:</h4>
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">Amount:</span>
                              <span className="text-green-600 font-semibold text-base">
                                Rs. {parseFloat(notification.data.amount || notification.data.amount).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">Transaction ID:</span>
                              <span className="font-mono text-xs text-gray-600">
                                {notification.data.transactionId}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">Payment Method:</span>
                              <span className="text-gray-800 capitalize font-medium">
                                {notification.data.paymentMethod || 'payfast'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">Status:</span>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                COMPLETE
                              </span>
                            </div>
                          </div>
                          
                          {notification.data.kametiId && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-700">Kameti ID:</span>
                                <span className="font-mono text-sm font-semibold text-gray-700">
                                  {notification.data.kametiId}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {notification.data && notification.type === 'join_request' && (
                        <div className="mt-3 ml-11 bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Join Request Details:</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">User:</span>
                              <span className="ml-2 text-gray-600">
                                {notification.data.userName} ({notification.data.userEmail})
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Kameti:</span>
                              <span className="ml-2 text-gray-600">
                                {notification.data.kametiName}
                              </span>
                            </div>
                            {notification.data.message && (
                              <div className="col-span-2">
                                <span className="font-medium text-gray-700">Message:</span>
                                <span className="ml-2 text-gray-600 italic">
                                  "{notification.data.message}"
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <p className="mt-2 ml-11 text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    
                    <div className="ml-4 flex gap-2">
                      {!notification.read && notification.type === 'join_request' && (
                        <>
                          <button
                            onClick={() => handleApproveRequest(notification)}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectRequest(notification)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </>
                      )}
                      {!notification.read && notification.type !== 'join_request' && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;