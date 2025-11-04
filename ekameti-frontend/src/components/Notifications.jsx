import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('ekametiUser') || 'null');
      if (!user?.email) {
        console.log('No user email found');
        setLoading(false);
        return;
      }

      console.log('🔔 Fetching notifications for:', user.email);
      
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
      const user = JSON.parse(localStorage.getItem('ekametiUser') || 'null');
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatAmount = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading notifications...</span>
      </div>
    );
  }

  return (
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
                      <h3 className="text-lg font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      )}
                    </div>
                    
                    <p className="mt-1 text-gray-600">{notification.message}</p>
                    
                    {notification.data && (
                      <div className="mt-3 bg-gray-100 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Details:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <span className="ml-2 text-green-600 font-semibold">
                              {formatAmount(notification.data.amount)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Transaction ID:</span>
                            <span className="ml-2 font-mono text-gray-600">
                              {notification.data.transactionId}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Payment Method:</span>
                            <span className="ml-2 text-gray-600 capitalize">
                              {notification.data.paymentMethod}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {notification.data.paymentStatus}
                            </span>
                          </div>
                        </div>
                        
                        {notification.data.kametiId && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-700">Kameti ID:</span>
                            <span className="ml-2 font-mono text-gray-600">
                              {notification.data.kametiId}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
