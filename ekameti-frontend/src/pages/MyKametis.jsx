// My Kametis page - shows only kametis where user is creator or member
// Similar to dashboard but dedicated view

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { getApiUrl } from '../config/api';
import '../styles/MyKametis.css';

const MyKametis = () => {
  const navigate = useNavigate();
  
  // state variables
  const [user, setUser] = useState(null);
  const [kametis, setKametis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // load data when page opens
  useEffect(() => {
    loadMyKametis();
  }, []);

  // fetch kametis where user is involved
  const loadMyKametis = async () => {
    try {
      // get user from storage
      const storedUser = localStorage.getItem('ekametiUser');
      if (!storedUser) {
        navigate('/login');
        return;
      }

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
    } catch (error) {
      console.error('Error loading kametis:', error);
      setKametis([]);
    } finally {
      setLoading(false);
    }
  };

  // filter kametis based on search and status
  const filteredKametis = kametis.filter(kameti => {
    // search filter
    const matchesSearch = kameti.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kameti.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // status filter
    const matchesStatus = filterStatus === 'all' || kameti.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // calculate stats
  const createdCount = kametis.filter(k => k.createdBy === user?._id).length;
  const joinedCount = kametis.filter(k => 
    k.createdBy !== user?._id && 
    k.members?.some(m => m.userId === user?._id || m.email === user?.email)
  ).length;
  const activeCount = kametis.filter(k => k.status === 'Active').length;

  return (
    <div className="my-kametis-container">
      <NavBar />

      {/* Hero section */}
      <div className="my-kametis-hero">
        <div className="hero-content">
          <h1 className="hero-title">My Kametis</h1>
          <p className="hero-subtitle">All kametis you've created or joined</p>
        </div>
      </div>

      <div className="my-kametis-main">
        
        {/* Stats cards */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Created by Me</p>
              <p className="stat-value">{createdCount}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Joined as Member</p>
              <p className="stat-value">{joinedCount}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <p className="stat-label">Active Kametis</p>
              <p className="stat-value">{activeCount}</p>
            </div>
          </div>
        </div>

        {/* Filters and search */}
        <div className="filters-section">
          <div className="search-box">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search kametis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All
            </button>
            <button 
              className={`filter-tab ${filterStatus === 'Active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Active')}
            >
              Active
            </button>
            <button 
              className={`filter-tab ${filterStatus === 'Pending' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Pending')}
            >
              Pending
            </button>
            <button 
              className={`filter-tab ${filterStatus === 'Completed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('Completed')}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Kametis list */}
        <div className="kametis-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading your kametis...</p>
            </div>
          ) : filteredKametis.length > 0 ? (
            <div className="kametis-grid">
              {filteredKametis.map((kameti) => {
                const isCreator = kameti.createdBy === user?._id;
                
                return (
                  <div 
                    key={kameti._id} 
                    className="kameti-card"
                    onClick={() => navigate(`/kameti-details/${kameti._id}`)}
                  >
                {/* Horizontal Dashboard Layout */}
                <div className="kameti-header">
                  <div>
                    <div className="kameti-icon-wrapper">
                      <svg className="kameti-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="kameti-info-wrapper">
                      <h4 className="kameti-name">{kameti.name}</h4>
                      <p className="kameti-details-text">
                        Rs. {kameti.amount?.toLocaleString()} • {kameti.membersCount} members • Round {kameti.currentRound || 1}
                      </p>
                    </div>
                  </div>
                  <div className="kameti-footer">
                    <span className={`status-badge ${kameti.status.toLowerCase()}`}>
                      {kameti.status}
                    </span>
                    <span className="role-badge">
                      {isCreator ? (
                        <>
                          <svg className="role-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                          </svg>
                          Creator
                        </>
                      ) : (
                        <>
                          <svg className="role-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          Member
                        </>
                      )}
                    </span>
                  </div>
                </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3>No Kametis Found</h3>
              <p>{searchTerm ? 'Try adjusting your search' : 'You haven\'t created or joined any kametis yet'}</p>
              <button onClick={() => navigate('/create-kameti')} className="create-btn">
                Create Kameti
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyKametis;

