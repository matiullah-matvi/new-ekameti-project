// All Kametis page - browse and search all available kametis
// Styling in AllKametis.css

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import { useTranslation } from '../hooks/useTranslation';
import '../styles/AllKametis.css';

const AllKametis = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  // state management
  const [kametis, setKametis] = useState([]);
  const [filteredKametis, setFilteredKametis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, active, completed
  const [filterFrequency, setFilterFrequency] = useState('all'); // all, weekly, monthly, etc
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount-high, amount-low
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  // get current user
  const user = JSON.parse(localStorage.getItem('ekametiUser'));

  // fetch all kametis
  useEffect(() => {
    fetchAllKametis();
  }, []);

  // apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [kametis, searchQuery, filterStatus, filterFrequency, sortBy]);

  const fetchAllKametis = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching kametis from backend...');
      
      // fetch all kametis from backend
      const response = await axios.get(getApiUrl('kameti'));
      console.log('✅ Fetched kametis:', response.data);
      console.log('📊 Total kametis found:', response.data.length);
      
      setKametis(response.data);
      setFilteredKametis(response.data); // also set filtered kametis initially
    } catch (error) {
      console.error('❌ Error fetching kametis:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setKametis([]); // set empty array on error
      setFilteredKametis([]);
      } finally {
        setLoading(false);
      }
    };

  // apply all filters and sorting
  const applyFilters = () => {
    let result = [...kametis];

    // search filter - case insensitive
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(k => {
        const name = k.name?.toLowerCase() || '';
        const description = k.description?.toLowerCase() || '';
        const creator = k.createdByName?.toLowerCase() || '';
        
        return name.includes(query) || 
               description.includes(query) || 
               creator.includes(query);
      });
    }

    // status filter
    if (filterStatus && filterStatus !== 'all') {
      result = result.filter(k => {
        const status = k.status?.toLowerCase() || '';
        return status === filterStatus.toLowerCase();
      });
    }

    // frequency filter
    if (filterFrequency && filterFrequency !== 'all') {
      result = result.filter(k => k.contributionFrequency === filterFrequency);
    }

    // sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateA - dateB;
        });
        break;
      case 'amount-high':
        result.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case 'amount-low':
        result.sort((a, b) => (a.amount || 0) - (b.amount || 0));
        break;
      default:
        break;
    }

    console.log('Filtered results:', result.length, 'out of', kametis.length);
    setFilteredKametis(result);
  };

  // clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterFrequency('all');
    setSortBy('newest');
  };

  // send join request to kameti admin
  const handleJoinKameti = async (kameti) => {
    if (!user) {
      alert('Please login to join a kameti');
      navigate('/');
      return;
    }

    // check if user is already a member
    const isAlreadyMember = kameti.members?.some(m => m.email === user.email);
    if (isAlreadyMember) {
      alert('You are already a member of this kameti!');
      return;
    }

    // check if already sent a request
    const hasPendingRequest = kameti.joinRequests?.some(
      r => r.email === user.email && r.status === 'pending'
    );
    if (hasPendingRequest) {
      alert('You have already sent a join request. Please wait for admin approval.');
      return;
    }

    // check if kameti is full
    if (kameti.members?.length >= kameti.membersCount) {
      alert('This kameti is already full!');
      return;
    }

    // send join request
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'H8',
          location:'pages/AllKametis.jsx:handleJoinKameti',
          message:'Sending join request',
          data:{kametiMongoId:kameti?._id,userIdPresent:!!user?._id,userEmailPresent:!!user?.email,membersCount:kameti?.membersCount,currentMembers:kameti?.members?.length},
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion

      const response = await axios.post(
        getApiUrl(`kameti/request-join/${kameti._id}`),
        {
          userId: user._id,
          message: '' // optional message can be added later with a modal
        }
      );

      alert(response.data.message || 'Join request sent! Wait for admin approval.');
      
      // refresh kametis to update UI
      fetchAllKametis();
    } catch (error) {
      console.error('Error sending join request:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sessionId:'debug-session',
          runId:'pre-fix',
          hypothesisId:'H8',
          location:'pages/AllKametis.jsx:handleJoinKameti',
          message:'Join request failed',
          data:{status:error?.response?.status,apiMessage:error?.response?.data?.message,errMessage:error?.message},
          timestamp:Date.now()
        })
      }).catch(()=>{});
      // #endregion
      const reason =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to send join request';
      alert(reason);
    }
  };

  // view kameti details
  const handleViewDetails = (kametiId) => {
    navigate(`/kameti-details/${kametiId}`);
  };

  // check if user can join a kameti
  const canJoinKameti = (kameti) => {
    if (!user) return false;
    // ✅ Check if kameti is closed/completed - cannot join
    if (kameti.status === 'Closed' || kameti.status === 'Completed') return false;
    const isAlreadyMember = kameti.members?.some(m => m.email === user.email);
    const hasPendingRequest = kameti.joinRequests?.some(
      r => r.email === user.email && r.status === 'pending'
    );
    const isFull = kameti.members?.length >= kameti.membersCount;
    return !isAlreadyMember && !hasPendingRequest && !isFull;
  };

  // get join button text
  const getJoinButtonText = (kameti) => {
    if (!user) return 'Login to Join';
    // ✅ Check if kameti is closed/completed
    if (kameti.status === 'Closed' || kameti.status === 'Completed') return 'Closed';
    const isAlreadyMember = kameti.members?.some(m => m.email === user.email);
    if (isAlreadyMember) return 'Already Joined';
    const hasPendingRequest = kameti.joinRequests?.some(
      r => r.email === user.email && r.status === 'pending'
    );
    if (hasPendingRequest) return 'Request Pending';
    const isFull = kameti.members?.length >= kameti.membersCount;
    if (isFull) return 'Full';
    return 'Request to Join';
  };

  return (
    <div className="all-kametis-container">
      <NavBar />

      {/* hero section */}
      <div className="all-kametis-hero">
        <div className="hero-content">
          <h1 className="hero-title">{t('allKametis.browseAll')}</h1>
          <p className="hero-subtitle">{t('allKametis.findAndJoin')}</p>
          
          {/* search bar */}
          <div className="hero-search">
            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('allKametis.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="search-clear">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* main content */}
      <div className="all-kametis-main">
        
        {/* filters and controls */}
        <div className="controls-bar">
          <div className="filters-section">
            {/* status filter */}
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>

            {/* frequency filter */}
            <select 
              value={filterFrequency} 
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Frequencies</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>

            {/* sort by */}
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Highest Amount</option>
              <option value="amount-low">Lowest Amount</option>
            </select>

            {/* clear filters */}
            {(searchQuery || filterStatus !== 'all' || filterFrequency !== 'all' || sortBy !== 'newest') && (
              <button onClick={clearFilters} className="clear-filters-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>

          {/* view mode toggle */}
          <div className="view-toggle">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* results count */}
        <div className="results-info">
          <p className="results-count">
            Showing <span className="count-highlight">{filteredKametis.length}</span> of <span className="count-highlight">{kametis.length}</span> kametis
          </p>
          </div>

        {/* kametis display */}
          {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading kametis...</p>
          </div>
        ) : filteredKametis.length > 0 ? (
          <div className={viewMode === 'grid' ? 'kametis-grid' : 'kametis-list'}>
            {filteredKametis.map((kameti) => (
              <div 
                key={kameti._id} 
                className="kameti-card"
                onClick={() => handleViewDetails(kameti._id)}
                style={{ cursor: 'pointer' }}
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
                        Rs. {kameti.amount?.toLocaleString()} • {kameti.members?.length || 0}/{kameti.membersCount} members • {kameti.contributionFrequency}
                      </p>
                    </div>
                  </div>
                  <div className="kameti-footer">
                    <span className={`status-badge ${kameti.status.toLowerCase()}`}>
                      {kameti.status}
                    </span>
                    <span className="admin-badge">
                      <svg className="admin-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      {kameti.createdByName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="empty-title">No Kametis Found</h3>
            <p className="empty-description">
              {searchQuery || filterStatus !== 'all' || filterFrequency !== 'all' 
                ? 'Try adjusting your filters or search query' 
                : 'No kametis available at the moment'}
            </p>
            {(searchQuery || filterStatus !== 'all' || filterFrequency !== 'all') && (
              <button onClick={clearFilters} className="empty-action-btn">
                Clear All Filters
                    </button>
                  )}
              </div>
          )}
        </div>
    </div>
  );
};

export default AllKametis;
