import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/JoinKameti.css';

const JoinKameti = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [kameti, setKameti] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const user = JSON.parse(localStorage.getItem('ekametiUser'));

  useEffect(() => {
    const fetchKameti = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/kameti/${id}`);
        setKameti(res.data);
      } catch (err) {
        console.error('❌ Error:', err);
        setMessage('❌ Kameti not found');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      console.log('📦 Fetching Kameti with ID:', id);
      fetchKameti();
    }
  }, [id]);

  const handleJoin = async () => {
    if (!user) {
      setMessage('❌ Please log in to join Kameti');
      setMessageType('error');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const res = await axios.post(`http://localhost:5000/api/kameti/join/${id}`, {
        userId: user._id,
      });
      console.log('✅ Join response:', res.data);
      setMessage('✅ Joined Kameti successfully!');
      setMessageType('success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      console.error('❌ Failed to join Kameti:', err.response?.data || err.message);
      setMessage(err.response?.data?.message || '❌ Failed to join');
      setMessageType('error');
    }
  };

  const handleIgnore = async () => {
    if (!user) {
      navigate('/dashboard');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/kameti/ignore/${id}`, {
        userId: user._id,
      });
      console.log('✅ Ignore sent to admin');
    } catch (err) {
      console.error('❌ Failed to send ignore notification:', err);
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="join-kameti-container">
      {/* Hero Section */}
      <div className="join-hero">
        <div className="hero-overlay"></div>
        <div className="hero-blob-right"></div>
        <div className="hero-blob-left"></div>
        
        <div className="hero-content">
          <div className="hero-inner">
            <div className="hero-badge">
              <svg className="hero-badge-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>You've been invited!</span>
            </div>

            <h1 className="hero-title">Join Kameti</h1>
            <p className="hero-subtitle">Accept or decline this Kameti invitation</p>
          </div>
        </div>
      </div>

      <div className="join-main">
        {loading ? (
          <div className="panel-card">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Loading Kameti details...</span>
            </div>
          </div>
        ) : kameti ? (
          <>
            {/* Kameti Details Card */}
            <div className="panel-card">
              <div className="kameti-header-section">
                <div className="kameti-icon-wrapper">
                  <svg className="kameti-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="kameti-info">
                  <h3 className="kameti-name">{kameti.name}</h3>
                  {kameti.description && (
                    <p className="kameti-description">{kameti.description}</p>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon blue">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">Contribution</p>
                    <p className="stat-value">Rs. {kameti.amount?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon green">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">Members</p>
                    <p className="stat-value">{kameti.membersCount || '0'}</p>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon purple">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">Start Date</p>
                    <p className="stat-value">
                      {new Date(kameti.startDate || kameti.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="stat-item">
                  <div className="stat-icon yellow">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">Frequency</p>
                    <p className="stat-value capitalize">{kameti.contributionFrequency || 'Monthly'}</p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="status-section">
                <span className={`chip-${kameti.status?.toLowerCase() === 'active' ? 'active' : kameti.status?.toLowerCase() === 'pending' ? 'pending' : 'inactive'}`}>
                  {kameti.status || 'Active'}
                </span>
                <span className="round-info">
                  Round {kameti.currentRound || 1} of {kameti.totalRounds || 'N/A'}
                </span>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`message-box ${messageType === 'success' ? 'success' : 'error'}`}>
                  {message}
                </div>
              )}

              {/* Action Buttons */}
              <div className="action-buttons">
                <button onClick={handleJoin} className="action-btn primary">
                  <span className="action-btn-content">
                    <svg className="action-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Join Kameti</span>
                  </span>
                </button>

                <button onClick={handleIgnore} className="action-btn secondary">
                  <span className="action-btn-content">
                    <svg className="action-btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Decline</span>
                  </span>
                </button>
              </div>

              {/* Login Prompt */}
              {!user && (
                <div className="login-prompt">
                  <p className="login-prompt-text">
                    Want to see your Kametis? <Link to="/login" className="login-link">Log in here</Link>
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="panel-card">
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="empty-title">Kameti Not Found</h3>
              <p className="empty-description">{message || 'This Kameti invitation link is invalid or has expired.'}</p>
              <Link to="/" className="empty-action-btn">
                Go to Homepage
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinKameti;
