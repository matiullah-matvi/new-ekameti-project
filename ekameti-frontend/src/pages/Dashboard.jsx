// Dashboard - main page after login
// Shows user stats, quick actions, and kameti list

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getApiUrl } from '../config/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();

  // state for user data
  const [user, setUser] = useState(null);
  const [kametis, setKametis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // load everything when page opens
  useEffect(() => {
    loadDashboardData();
  }, []);

  // main function to load all data
  const loadDashboardData = async () => {
    try {
      // get user from storage
      const storedUser = localStorage.getItem('ekametiUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // fetch all kametis
        const response = await axios.get(getApiUrl('kameti'));
        const allKametis = response.data || [];
        
        // fetch user's joined kametis from the new endpoint
        let joinedKametis = [];
        try {
          const joinedResponse = await axios.get(getApiUrl(`users/joined-kametis/${parsedUser.email}`));
          joinedKametis = joinedResponse.data.joinedKametis || [];
          console.log('✅ Fetched joined Kametis:', joinedKametis);
        } catch (error) {
          console.log('⚠️ Could not fetch joined Kametis:', error.message);
        }
        
        // filter to show only kametis where user is creator OR member
        const userKametis = allKametis.filter(kameti => {
          // check if user is the creator
          const isCreator = kameti.createdBy === parsedUser._id;
          
          // check if user is a member
          const isMember = kameti.members?.some(member => 
            member.userId === parsedUser._id || member.email === parsedUser.email
          );
          
          // check if user has joined this kameti (from joinedKametis array)
          const hasJoined = joinedKametis.some(joined => joined.kametiId === kameti.kametiId);
          
          return isCreator || isMember || hasJoined;
        });
        
        setKametis(userKametis);
        
        // fetch notifications using all kametis
        fetchNotifications(parsedUser, allKametis);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      setKametis([]);
      } finally {
        setLoading(false);
      }
    };

  // fetch notifications for user
  const fetchNotifications = (currentUser, allKametis) => {
    try {
      const userNotifications = [];
      
      allKametis.forEach(kameti => {
        // admin gets join requests
        if (kameti.createdBy === currentUser._id) {
          const pendingRequests = kameti.joinRequests?.filter(r => r.status === 'pending') || [];
          pendingRequests.forEach(request => {
            userNotifications.push({
              id: `request-${kameti._id}-${request._id}`,
              type: 'join_request',
              message: `${request.name} wants to join "${kameti.name}"`,
            });
          });
        }
        
        // user gets request status updates
        const userRequests = kameti.joinRequests?.filter(r => r.email === currentUser.email) || [];
        userRequests.forEach(request => {
          if (request.status === 'approved') {
            userNotifications.push({
              id: `approved-${kameti._id}-${request._id}`,
              type: 'request_approved',
              message: `Your request to join "${kameti.name}" was approved!`,
            });
          } else if (request.status === 'rejected') {
            userNotifications.push({
              id: `rejected-${kameti._id}-${request._id}`,
              type: 'request_rejected',
              message: `Your request to join "${kameti.name}" was declined`,
            });
          }
        });
      });
      
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // calculate stats from kametis
  const activeCount = kametis.filter(k => k.status === 'Active').length;
  const totalAmount = kametis.reduce((sum, k) => sum + (k.amount || 0), 0);
  const pendingCount = kametis.filter(k => k.status === 'Pending').length;

  return (
    <div className="dashboard-container">
      <NavBar />

      {/* Hero section with gradient */}
      <div className="dashboard-hero">
        <div className="hero-overlay"></div>
        <div className="hero-blob-right"></div>
        <div className="hero-blob-left"></div>
        
        <div className="hero-content">
          <div className="hero-inner">
            {/* welcome badge */}
            <div className="hero-badge">
              <svg className="hero-badge-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Welcome back, {user?.fullName || 'User'}</span>
            </div>

            <h1 className="hero-title">Your Financial Dashboard</h1>
            <p className="hero-subtitle">Manage your kametis, track contributions, and achieve your savings goals</p>

            {/* main action buttons */}
            <div className="hero-actions">
              <button onClick={() => navigate('/create-kameti')} className="hero-btn-primary">
                <svg className="hero-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Kameti</span>
              </button>
              <button onClick={() => navigate('/all-kametis')} className="hero-btn-secondary">
                Browse All Kametis
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        
        {/* Statistics cards - 4 boxes showing key metrics */}
        <div className="kpi-grid">
          
          {/* card 1: total balance */}
          <div className="kpi-card">
            <div className="kpi-card-wrapper">
              <div>
                <p className="kpi-card-label">Total Savings</p>
                <p className="kpi-card-value">Rs. {totalAmount.toLocaleString()}</p>
                <p className="kpi-card-trend kpi-trend-positive">+12% growth</p>
              </div>
              <div className="kpi-card-icon icon-bg-blue">
                <svg className="icon-svg icon-text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill kpi-progress-blue"></div>
            </div>
          </div>

          {/* card 2: active kametis count */}
          <div className="kpi-card">
            <div className="kpi-card-wrapper">
              <div>
                <p className="kpi-card-label">Active Kametis</p>
                <p className="kpi-card-value">{activeCount}</p>
                <p className="kpi-card-trend kpi-trend-positive">+2 this month</p>
              </div>
              <div className="kpi-card-icon icon-bg-green">
                <svg className="icon-svg icon-text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill kpi-progress-green"></div>
            </div>
          </div>

          {/* card 3: pending payments */}
          <div className="kpi-card">
            <div className="kpi-card-wrapper">
              <div>
                <p className="kpi-card-label">Pending Payments</p>
                <p className="kpi-card-value">{pendingCount}</p>
                <p className="kpi-card-trend kpi-trend-warning">Due this week</p>
              </div>
              <div className="kpi-card-icon icon-bg-yellow">
                <svg className="icon-svg icon-text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill kpi-progress-yellow"></div>
            </div>
          </div>

          {/* card 4: total kametis ever joined */}
          <div className="kpi-card">
            <div className="kpi-card-wrapper">
              <div>
                <p className="kpi-card-label">Total Kametis</p>
                <p className="kpi-card-value">{kametis.length}</p>
                <p className="kpi-card-trend kpi-trend-info">All time</p>
              </div>
              <div className="kpi-card-icon icon-bg-purple">
                <svg className="icon-svg icon-text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="kpi-progress-bar">
              <div className="kpi-progress-fill kpi-progress-purple"></div>
            </div>
          </div>
        </div>

        {/* main content - sidebar + list */}
        <div className="content-grid">
          
          {/* left sidebar with quick links */}
          <div className="content-col-1">
            <div className="panel-card">
              <h3 className="panel-title">Quick Actions</h3>
              <div className="actions-list">
                
                <button onClick={() => navigate('/all-kametis')} className="action-btn group">
                  <div className="action-btn-content">
                    <div className="action-btn-icon icon-bg-green group-hover-bg-green">
                      <svg className="icon-svg-sm icon-text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <span className="action-btn-label">Browse Kametis</span>
                  </div>
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button onClick={() => navigate('/my-kametis')} className="action-btn group">
                  <div className="action-btn-content">
                    <div className="action-btn-icon icon-bg-purple group-hover-bg-purple">
                      <svg className="icon-svg-sm icon-text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="action-btn-label">My Kametis</span>
                  </div>
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button onClick={() => navigate('/payments')} className="action-btn group">
                  <div className="action-btn-content">
                    <div className="action-btn-icon icon-bg-indigo group-hover-bg-indigo">
                      <svg className="icon-svg-sm icon-text-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="action-btn-label">Payment History</span>
                  </div>
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button onClick={() => navigate('/notifications')} className="action-btn group">
                  <div className="action-btn-content">
                    <div className="action-btn-icon icon-bg-red group-hover-bg-red">
                      <svg className="icon-svg-sm icon-text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="notification-badge">{unreadCount}</span>
                      )}
                    </div>
                    <div className="action-btn-label-wrapper">
                      <span className="action-btn-label">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="notification-count-text">{unreadCount} new</span>
                      )}
                    </div>
                  </div>
                  <svg className="action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
        </div>

          {/* right side - list of user's kametis */}
          <div className="content-col-2">
            <div className="panel-card">
              
              {/* header with search box */}
              <div className="kametis-header">
                <div className="kametis-header-inner">
                  <h3 className="panel-title">Your Kametis</h3>
                  <div className="kametis-search-wrapper">
                    <div className="kametis-search">
                      <input type="text" placeholder="Search kametis..." className="kametis-search-input" />
                      <svg className="kametis-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
          </div>

              <div className="kametis-content">
          {loading ? (
                  // show spinner while loading
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span className="loading-text">Loading your kametis...</span>
                  </div>
          ) : kametis.length > 0 ? (
                  // display kametis if found
                  <div className="kametis-list">
                    {kametis.map((kameti) => (
                      <div 
                        key={kameti._id} 
                        className="kameti-card"
                        onClick={() => navigate(`/kameti-details/${kameti._id}`)}
                      >
                        <div className="kameti-item">
                          <div className="kameti-icon-wrapper">
                            <svg className="kameti-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="kameti-info">
                            <h4 className="kameti-name">{kameti.name}</h4>
                            <p className="kameti-details">
                              Rs. {kameti.amount?.toLocaleString()} • {kameti.membersCount} members • Round {kameti.currentRound || 1}
                            </p>
                          </div>
                        </div>
                        <div className="kameti-actions">
                          <span className={`chip-${kameti.status === 'Active' ? 'active' : kameti.status === 'Pending' ? 'pending' : 'inactive'}`}>
                  {kameti.status}
                </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // show empty state if no kametis
                  <div className="empty-state">
                    <div className="empty-icon-wrapper">
                      <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="empty-title">No Kametis Yet</h3>
                    <p className="empty-description">Start your savings journey by creating or joining a kameti.</p>
                    <button onClick={() => navigate('/create-kameti')} className="empty-action-btn">
                      Create Your First Kameti
                    </button>
              </div>
          )}
        </div>
            </div>
          </div>
        </div>

        {/* recent activity section at bottom */}
        <div className="panel-card">
          <h3 className="panel-title">Recent Activity</h3>
          <div className="activity-timeline">
            
            <div className="activity-item">
              <div className="activity-icon icon-bg-green">
                <svg className="icon-svg-sm icon-text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="activity-content">
                <p className="activity-text-primary">Payment received</p>
                <p className="activity-text-secondary">Rs. 5,000 from Family Kameti</p>
              </div>
              <span className="activity-time">2 hours ago</span>
            </div>

            <div className="activity-item">
              <div className="activity-icon icon-bg-blue">
                <svg className="icon-svg-sm icon-text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="activity-content">
                <p className="activity-text-primary">Joined new kameti</p>
                <p className="activity-text-secondary">Office Savings Group</p>
              </div>
              <span className="activity-time">1 day ago</span>
            </div>

            <div className="activity-item">
              <div className="activity-icon icon-bg-yellow">
                <svg className="icon-svg-sm icon-text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="activity-content">
                <p className="activity-text-primary">Payment reminder</p>
                <p className="activity-text-secondary">Monthly contribution due tomorrow</p>
              </div>
              <span className="activity-time">3 days ago</span>
            </div>

            <div className="activity-item">
              <div className="activity-icon icon-bg-purple">
                <svg className="icon-svg-sm icon-text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="activity-content">
                <p className="activity-text-primary">Contribution completed</p>
                <p className="activity-text-secondary">Rs. 3,000 to Friends Kameti</p>
              </div>
              <span className="activity-time">5 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
