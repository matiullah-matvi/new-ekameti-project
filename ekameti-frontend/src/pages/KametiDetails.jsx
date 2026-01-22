// Kameti Details page - comprehensive management interface
// Styling in KametiDetails.css

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiUrl, getFrontendUrl } from '../config/api';
import RiskAnalysisCard from '../components/RiskAnalysisCard';
import '../styles/KametiDetails.css';

const KametiDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // state management
  const [kameti, setKameti] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, members, payments, disputes, settings
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resolveData, setResolveData] = useState({
    resolutionType: '',
    resolutionAmount: '',
    resolutionNotes: ''
  });
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // get current user (refresh on every render)
  const [user, setUser] = useState(null);
  
  // disputes state management
  const [disputes, setDisputes] = useState([]);
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  
  // risk analysis state
  const [kametiRisk, setKametiRisk] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  
  // refresh user data on component mount and when localStorage changes
  useEffect(() => {
    const refreshUserData = () => {
      const storedUser = localStorage.getItem('ekametiUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        console.log('🔄 User data refreshed:', JSON.parse(storedUser));
      }
    };
    
    refreshUserData();
    
    // Refresh user data when page becomes visible (user returns from payment)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUserData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Only compute these if kameti exists
  const isCreator = kameti ? (
    kameti.createdBy === user?._id || 
    kameti.createdBy === user?.id || 
    kameti.createdBy?.toString() === user?._id?.toString() || 
    kameti.createdBy?.toString() === user?.id?.toString()
  ) : false;
  
  // #region agent log
  // Log isCreator check for admin buttons
  if (kameti && user) {
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KametiDetails.jsx:54',message:'isCreator check for admin',data:{userId:user?._id||user?.id,createdBy:kameti?.createdBy,createdByType:typeof kameti?.createdBy,userIdType:typeof (user?._id||user?.id),isCreator,disputesCount:disputes.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run-admin',hypothesisId:'admin-visibility'})}).catch(()=>{});
  }
  // #endregion

  // fetch kameti details
  useEffect(() => {
    fetchKametiDetails();
  }, [id]);

  // Fetch risk when kameti is loaded
  useEffect(() => {
    if (kameti && !loading && kameti.kametiId) {
      console.log('🔄 Kameti loaded, fetching risk for:', kameti.kametiId);
      // Small delay to ensure kameti is fully set
      const timer = setTimeout(() => {
        fetchKametiRisk();
      }, 100);
      return () => clearTimeout(timer);
    } else if (kameti && !loading && kameti._id && !kameti.kametiId) {
      console.log('🔄 Kameti loaded with _id only, fetching risk for:', kameti._id);
      const timer = setTimeout(() => {
        fetchKametiRisk();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [kameti, loading]);

  // fetch disputes when disputes tab is active
  useEffect(() => {
    if (activeTab === 'disputes' && kameti && kameti.kametiId) {
      fetchDisputes();
    }
  }, [activeTab, kameti]);

  const fetchKametiDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(getApiUrl(`kameti/${id}`));
      console.log('Kameti data:', response.data);
      console.log('🔍 Kameti status:', response.data?.status);
      console.log('🔍 Kameti ID:', response.data?.kametiId || response.data?._id);
      console.log('🔍 Should hide payment section?', response.data?.status === 'Closed' || response.data?.status === 'Completed');
      setKameti(response.data);
      
      // Trigger risk fetch after kameti is set (with delay to ensure state is updated)
      if (response.data && (response.data.kametiId || response.data._id)) {
        setTimeout(() => {
          console.log('🔄 Auto-triggering risk fetch after kameti load');
          // Use the response data directly to avoid state timing issues
          const kametiIdToUse = response.data.kametiId || response.data._id;
          if (kametiIdToUse) {
            const token = localStorage.getItem('token');
            if (token) {
              axios.get(getApiUrl(`risk/kameti-summary/${kametiIdToUse}`), {
                headers: { Authorization: `Bearer ${token}` }
              }).then(res => {
                if (res.data && res.data.success && res.data.summary) {
                  console.log('✅ Risk data loaded:', res.data.summary);
                  setKametiRisk(res.data.summary);
                }
              }).catch(err => {
                console.error('❌ Risk fetch error:', err);
              });
            }
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error fetching kameti:', error);
      setError(error.response?.data?.message || 'Failed to load kameti details');
      setKameti(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputes = async () => {
    if (!kameti || !kameti.kametiId) {
      console.warn('Cannot fetch disputes: kameti or kametiId is missing', { kameti });
      setDisputes([]);
      return;
    }
    
    try {
      setLoadingDisputes(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, cannot fetch disputes');
        setDisputes([]);
        return;
      }
      
      console.log('🔍 Fetching disputes for kameti:', kameti.kametiId);
      const response = await axios.get(getApiUrl(`disputes/kameti/${kameti.kametiId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Disputes fetched:', response.data);
      setDisputes(response.data.disputes || []);
    } catch (error) {
      console.error('❌ Error fetching disputes:', error);
      console.error('Error details:', error.response?.data);
      setDisputes([]); // Set empty array on error
    } finally {
      setLoadingDisputes(false);
    }
  };

  const fetchKametiRisk = async () => {
    if (!kameti) {
      console.log('⚠️ Cannot fetch risk: kameti is null');
      setKametiRisk(null);
      setLoadingRisk(false);
      return;
    }
    
    // Prefer kametiId, fallback to _id
    const kametiIdToUse = kameti.kametiId || kameti._id;
    if (!kametiIdToUse) {
      console.log('⚠️ Cannot fetch risk: kametiId or _id not found', { kameti });
      setKametiRisk(null);
      setLoadingRisk(false);
      return;
    }
    
    try {
      setLoadingRisk(true);
      setKametiRisk(null); // Clear previous data
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ Cannot fetch risk: no token found');
        setKametiRisk(null);
        setLoadingRisk(false);
        return;
      }
      
      const apiUrl = getApiUrl(`risk/kameti-summary/${kametiIdToUse}`);
      console.log('🔍 Fetching kameti risk:', {
        kametiId: kametiIdToUse,
        apiUrl: apiUrl,
        hasToken: !!token
      });
      
      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Risk API response:', response.data);
      
      if (response.data && response.data.success && response.data.summary) {
        console.log('✅ Setting risk data:', response.data.summary);
        setKametiRisk(response.data.summary);
      } else {
        console.warn('⚠️ Risk response format unexpected:', response.data);
        setKametiRisk(null);
      }
    } catch (error) {
      console.error('❌ Error fetching kameti risk:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        kametiId: kametiIdToUse,
        url: getApiUrl(`risk/kameti-summary/${kametiIdToUse}`)
      });
      setKametiRisk(null);
    } finally {
      setLoadingRisk(false);
    }
  };

  // Admin actions for disputes
  const handleMarkUnderReview = async (caseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        getApiUrl(`disputes/admin/${caseId}/review`),
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Dispute marked as under review');
      fetchDisputes(); // Refresh disputes list
    } catch (error) {
      console.error('Error marking dispute under review:', error);
      alert(error.response?.data?.message || 'Failed to update dispute status');
    }
  };

  const handleResolveDispute = async () => {
    if (!resolveData.resolutionType || !resolveData.resolutionNotes) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        getApiUrl(`disputes/admin/${selectedDispute.caseId}/resolve`),
        {
          resolutionType: resolveData.resolutionType,
          resolutionAmount: parseFloat(resolveData.resolutionAmount) || 0,
          resolutionNotes: resolveData.resolutionNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Dispute resolved successfully');
      setShowResolveModal(false);
      setResolveData({ resolutionType: '', resolutionAmount: '', resolutionNotes: '' });
      setSelectedDispute(null);
      fetchDisputes(); // Refresh disputes list
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert(error.response?.data?.message || 'Failed to resolve dispute');
    }
  };

  const handleRejectDispute = async () => {
    if (!rejectionNotes.trim()) {
      alert('Please provide rejection notes');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        getApiUrl(`disputes/admin/${selectedDispute.caseId}/reject`),
        { rejectionNotes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Dispute rejected');
      setShowRejectModal(false);
      setRejectionNotes('');
      setSelectedDispute(null);
      fetchDisputes(); // Refresh disputes list
    } catch (error) {
      console.error('Error rejecting dispute:', error);
      alert(error.response?.data?.message || 'Failed to reject dispute');
    }
  };

  const handleDeleteDispute = async (caseId) => {
    if (!window.confirm('Are you sure you want to delete this dispute? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        getApiUrl(`disputes/admin/${caseId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Dispute deleted successfully');
      fetchDisputes(); // Refresh disputes list
    } catch (error) {
      console.error('Error deleting dispute:', error);
      alert(error.response?.data?.message || 'Failed to delete dispute');
    }
  };

  // copy invitation link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/join-kameti/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  // share via whatsapp
  const shareViaWhatsApp = () => {
    if (!kameti) return;
    const link = `${window.location.origin}/join-kameti/${id}`;
    const message = `🎯 *Join ${kameti.name}*\n\n💰 Contribution: Rs. ${kameti.amount.toLocaleString()}\n👥 Members: ${kameti.membersCount}\n📅 ${kameti.contributionFrequency}\n\n👉 ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // calculate progress
  const calculateProgress = () => {
    if (!kameti) return 0;
    const currentMembers = kameti.members?.length || 0;
    return Math.round((currentMembers / kameti.membersCount) * 100);
  };

  // calculate total collected
  const calculateTotalCollected = () => {
    if (!kameti || !kameti.members) return 0;
    return kameti.members.filter(m => m.paymentStatus === 'paid').length * kameti.amount;
  };

  // approve join request
  const handleApproveRequest = async (requestId) => {
    try {
      const response = await axios.post(
        getApiUrl(`kameti/approve-request/${id}/${requestId}`),
        { adminId: user._id }
      );
      
      alert(response.data.message || 'Request approved successfully!');
      fetchKametiDetails(); // refresh data
    } catch (error) {
      console.error('Error approving request:', error);
      alert(error.response?.data?.message || 'Failed to approve request');
    }
  };

  // reject join request
  const handleRejectRequest = async (requestId) => {
    try {
      const response = await axios.post(
        getApiUrl(`kameti/reject-request/${id}/${requestId}`),
        { adminId: user._id }
      );
      
      alert(response.data.message || 'Request rejected');
      fetchKametiDetails(); // refresh data
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert(error.response?.data?.message || 'Failed to reject request');
    }
  };

  // send join request from details page
  const handleJoinRequest = async () => {
    if (!user) {
      alert('Please login to join this kameti');
      navigate('/');
      return;
    }

    try {
      const response = await axios.post(
        getApiUrl(`kameti/request-join/${id}`),
        {
          userId: user._id,
          message: ''
        }
      );

      alert(response.data.message || 'Join request sent! Wait for admin approval.');
      fetchKametiDetails(); // refresh to update button state
    } catch (error) {
      console.error('Error sending join request:', error);
      const reason =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to send join request';
      alert(reason);
    }
  };

  // handle payment for current user using PayFast sandbox
  const handlePayment = async () => {
    // ✅ Prevent payment if kameti is completed
    if (kameti?.status === 'Closed' || kameti?.status === 'Completed') {
      alert('❌ This kameti is closed. No further payments are required.');
      return;
    }
    if (!user) {
      alert('Please login to make payment');
      return;
    }

    if (!kameti) {
      alert('Kameti information is not available. Please refresh the page.');
      return;
    }

    try {
      console.log('💳 Initiating PayFast sandbox payment:', {
        amount: kameti.amount,
        userName: user.fullName,
        email: user.email,
        kametiId: kameti._id
      });

      // Call backend to generate PayFast URL with signature
      console.log('🔍 DEBUG: Kameti ID being sent:', kameti.kametiId);
      console.log('🔍 DEBUG: Kameti ID type:', typeof kameti.kametiId);
      console.log('🔍 DEBUG: Kameti ID length:', kameti.kametiId?.length);
      
      const response = await axios.post(getApiUrl('payfast/initiate'), {
        amount: kameti.amount,
        item_name: `Kameti Payment - ${kameti.name}`,
        item_description: `Contribution for Kameti "${kameti.name}" by ${user.fullName}`,
        user_email: user.email,
        user_name: user.fullName,
        kameti_id: kameti.kametiId,
        return_url: getFrontendUrl('payment-success'),
        cancel_url: getFrontendUrl('payment-cancel')
      });

      if (response.data.success) {
        console.log('✅ DEBUG: PayFast URL generated:', response.data.paymentUrl);
        console.log('✅ DEBUG: Transaction ID:', response.data.transactionId);
        console.log('✅ DEBUG: PayFast parameters:', response.data.parameters);
        
        // Log the return URL that PayFast will use
        const returnUrl = getFrontendUrl('payment-success');
        console.log('✅ DEBUG: PayFast will redirect to:', returnUrl);
        console.log('✅ DEBUG: PayFast should pass these parameters:', {
          amount: kameti.amount,
          transaction_id: response.data.transactionId,
          kameti_id: kameti._id
        });
        
        // Redirect to PayFast sandbox
        console.log('🔄 DEBUG: Redirecting to PayFast sandbox...');
        window.location.href = response.data.paymentUrl;
      } else {
        throw new Error(response.data.message || 'Failed to generate payment URL');
      }

    } catch (error) {
      console.error('Payment error:', error);
      
      // Fallback to demo payment if backend is not available
      if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        if (!kameti) {
          alert('Kameti information is not available. Please refresh the page.');
          return;
        }
        
        console.log('⚠️ Backend not available, using demo payment...');
        
        const amount = parseFloat(kameti.amount);
        const transactionId = `KAMETI-${kameti.kametiId}-${Date.now()}`;
        
        // Update user payment history (not global paymentStatus)
        const updatedUser = {
          ...user,
          // Don't update global paymentStatus - only update payment history
          lastPaymentDate: new Date().toISOString(),
          lastTransactionId: transactionId,
          lastPaymentAmount: amount,
          lastPaymentMethod: 'demo'
        };
        
        localStorage.setItem('ekametiUser', JSON.stringify(updatedUser));
        console.log('✅ Demo payment status updated in localStorage');
        
        // Redirect to success page
        const returnUrl = `${getFrontendUrl('payment-success')}?amount=${amount}&transaction_id=${transactionId}&kameti_id=${kameti.kametiId}`;
        console.log('🔄 DEBUG: Demo payment redirecting to:', returnUrl);
        console.log('🔄 DEBUG: Demo payment parameters:', {
          amount,
          transaction_id: transactionId,
          kameti_id: kameti.kametiId
        });
        window.location.href = returnUrl;
      } else {
        alert('Payment failed. Please try again.');
      }
    }
  };

  // check if user is a member (creator is also a member)
  const isMember = !!(isCreator || kameti?.members?.some(m => m.email === user?.email));
  
  // get current user's member data
  let currentMember = kameti?.members?.find(m => m.email === user?.email);
  
  // ✅ Enhanced: If creator is not in members array (old kametis), create virtual member entry
  if (isCreator && !currentMember && user) {
    currentMember = {
      userId: user._id,
      email: user.email,
      name: user.fullName || user.username || 'Admin',
      paymentStatus: 'unpaid', // Default to unpaid for creators not in members
      joinedAt: kameti.createdAt || new Date()
    };
  }
  
  // check user's payment status for THIS specific Kameti (not global status)
  const userPaymentStatus = currentMember?.paymentStatus || 'unpaid';
  
  console.log('🔍 KametiDetails Debug:', {
    userEmail: user?.email,
    userPaymentStatus: userPaymentStatus,
    currentMemberPaymentStatus: currentMember?.paymentStatus,
    isMember: isMember,
    currentMember: currentMember,
    kametiId: kameti?._id,
    kametiStatus: kameti?.status,
    shouldShowPayment: (isMember || isCreator) && currentMember && userPaymentStatus === 'unpaid' && kameti?.status !== 'Closed' && kameti?.status !== 'Completed'
  });

  // #region agent log
  if (kameti && user) {
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        sessionId:'debug-session',
        runId:'pre-fix',
        hypothesisId:'H6',
        location:'KametiDetails.jsx:payment-visibility',
        message:'Payment button visibility inputs',
        data:{
          isCreator,
          isMember,
          hasCurrentMember: !!currentMember,
          userPaymentStatus,
          userEmail: user?.email,
          kametiCreatedBy: kameti?.createdBy
        },
        timestamp:Date.now()
      })
    }).catch(()=>{});
  }
  // #endregion
  
  // check if user has pending request
  const hasPendingRequest = kameti?.joinRequests?.some(
    r => r.email === user?.email && r.status === 'pending'
  );
  
  // check if kameti is full
  const isFull = kameti ? (kameti.members?.length || 0) >= (kameti.membersCount || 0) : false;

  if (loading) {
    return (
      <div className="details-container">
        <NavBar />
        <div className="loading-screen">
          <div className="loading-spinner-large"></div>
          <p className="loading-text">Loading kameti details...</p>
        </div>
      </div>
    );
  }

  if (error || !kameti) {
    return (
      <div className="details-container">
        <NavBar />
        <div className="error-screen">
          <div className="error-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="error-title">Kameti Not Found</h2>
          <p className="error-message">{error || 'The kameti you\'re looking for doesn\'t exist or has been removed.'}</p>
          <button onClick={() => navigate('/dashboard')} className="error-btn">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="details-container">
      <NavBar />

      {/* hero header */}
      <div className="details-hero">
        <div className="details-hero-content">
          <div className="hero-back-btn" onClick={() => navigate('/dashboard')}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </div>
          
          <div className="hero-header">
            <div className="hero-title-section">
              <h1 className="hero-title">{kameti.name}</h1>
              <span className={`status-badge status-${kameti.status.toLowerCase()}`}>
                {kameti.status}
              </span>
            </div>
            <p className="hero-description">{kameti.description}</p>
          </div>

          {/* quick stats */}
          <div className="hero-stats">
            <div className="hero-stat-item">
              <div className="hero-stat-icon icon-bg-blue">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="hero-stat-content">
                <span className="hero-stat-label">Contribution</span>
                <span className="hero-stat-value">Rs. {kameti.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="hero-stat-item">
              <div className="hero-stat-icon icon-bg-green">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="hero-stat-content">
                <span className="hero-stat-label">Members</span>
                <span className="hero-stat-value">{kameti.members?.length || 0} / {kameti.membersCount}</span>
              </div>
            </div>

            <div className="hero-stat-item">
              <div className="hero-stat-icon icon-bg-purple">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="hero-stat-content">
                <span className="hero-stat-label">Frequency</span>
                <span className="hero-stat-value">{kameti.contributionFrequency}</span>
              </div>
            </div>

            <div className="hero-stat-item">
              <div className="hero-stat-icon icon-bg-yellow">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="hero-stat-content">
                <span className="hero-stat-label">Rounds</span>
                <span className="hero-stat-value">{kameti.currentRound} / {kameti.membersCount}</span>
              </div>
            </div>
          </div>

          {/* action buttons */}
          {isCreator && (
            <div className="hero-actions">
              <button onClick={() => setShowInviteModal(true)} className="hero-action-btn primary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Invite Members
              </button>
              <button onClick={shareViaWhatsApp} className="hero-action-btn secondary">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share via WhatsApp
              </button>
            </div>
          )}

          {!isCreator && !isMember && user && (
            <div className="hero-actions">
              {hasPendingRequest ? (
                <button className="hero-action-btn disabled" disabled>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Request Pending
                </button>
              ) : isFull ? (
                <button className="hero-action-btn disabled" disabled>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Kameti Full
                </button>
              ) : (
                <button onClick={handleJoinRequest} className="hero-action-btn primary">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Request to Join
                </button>
              )}
              <button onClick={shareViaWhatsApp} className="hero-action-btn secondary">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share via WhatsApp
              </button>
            </div>
          )}

          {!isCreator && isMember && user && (
            <div className="hero-actions">
              <button onClick={shareViaWhatsApp} className="hero-action-btn secondary">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Share via WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* main content */}
      <div className="details-main">
        
        {/* tabs navigation */}
        <div className="tabs-container">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('members')} 
            className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Members ({kameti?.members?.length || 0})
          </button>
          {isCreator && kameti?.joinRequests?.filter(r => r.status === 'pending').length > 0 && (
            <button 
              onClick={() => setActiveTab('requests')} 
              className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Requests ({kameti?.joinRequests?.filter(r => r.status === 'pending').length || 0})
            </button>
          )}
          <button 
            onClick={() => setActiveTab('payments')} 
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Payments
          </button>
          <button 
            onClick={() => setActiveTab('disputes')} 
            className={`tab-btn ${activeTab === 'disputes' ? 'active' : ''}`}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Disputes
          </button>
          {/* Payouts tab - visible to all members (view-only for non-admin) */}
          {(isCreator || isMember) && (
            <button 
              onClick={() => {
                const id = kameti?.kametiId || kameti?._id;
                if (id) navigate(`/payouts/${id}`);
              }} 
              className="tab-btn"
              style={{ cursor: 'pointer' }}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payouts
            </button>
          )}
          {isCreator && (
            <button 
              onClick={() => setActiveTab('settings')} 
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          )}
        </div>


        {/* Kameti Closed Message */}
        {(kameti?.status === 'Closed' || kameti?.status === 'Completed') && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#16a34a',
                marginBottom: '8px'
              }}>
                🔒 Kameti Closed
              </h3>
              <p style={{ 
                color: '#15803d',
                fontSize: '16px',
                marginBottom: '16px'
              }}>
                All rounds have been completed. All members have received their payouts. This kameti is now closed and no longer accepting new members or payments.
              </p>
              <div style={{
                backgroundColor: 'white',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Total Rounds Completed</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
                  {kameti.membersCount || kameti.currentRound || 'N/A'} of {kameti.membersCount || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Section for Current User (including admin/creator) - ONLY show if kameti is NOT closed */}
        {kameti?.status !== 'Closed' && kameti?.status !== 'Completed' && (isMember || isCreator) && currentMember && userPaymentStatus === 'unpaid' && (
          <div className="payment-section" style={{
            backgroundColor: '#f8fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                💰 Payment Required
              </h3>
              <p style={{ 
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                Complete your contribution to continue participating in this Kameti
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                  Contribution Amount
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                  Rs. {kameti.amount.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                  Payment Method
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                  PayFast
                </div>
              </div>
            </div>

            <button 
              onClick={handlePayment}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#047857'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#059669'}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pay Now
            </button>

          <div style={{
            marginTop: '16px',
            fontSize: '12px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            PayFast Sandbox - Secure test payments
          </div>
          </div>
        )}

        {/* Payment Success Message for Paid Users (including admin/creator) - ONLY show if kameti is NOT closed */}
        {kameti?.status !== 'Closed' && kameti?.status !== 'Completed' && (isMember || isCreator) && currentMember && userPaymentStatus === 'paid' && (
          <div className="payment-success-section" style={{
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#15803d',
                marginBottom: '8px'
              }}>
                ✅ Payment Completed
              </h3>
              <p style={{ 
                color: '#166534',
                fontSize: '14px',
                marginBottom: '16px'
              }}>
                Your contribution has been successfully processed
              </p>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #22c55e',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>
                  Amount Paid
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#15803d' }}>
                  Rs. {kameti.amount.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#166534', marginBottom: '4px' }}>
                  Status
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                  ✓ Paid
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment confirmed and processed
            </div>
          </div>
        )}

        {/* tab content */}
        <div className="tab-content">
          
          {/* overview tab */}
          {activeTab === 'overview' && (
            <div className="overview-grid">
              
              {/* progress card */}
              <div className="overview-card">
                <h3 className="card-title">Member Progress</h3>
                <div className="progress-section">
                  <div className="progress-info">
                    <span className="progress-label">Members Joined</span>
                    <span className="progress-value">{kameti.members?.length || 0} / {kameti.membersCount}</span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${calculateProgress()}%` }}></div>
                  </div>
                  <span className="progress-percentage">{calculateProgress()}% Complete</span>
                </div>
              </div>

              {/* financial summary */}
              <div className="overview-card">
                <h3 className="card-title">Financial Summary</h3>
                <div className="financial-grid">
                  <div className="financial-item">
                    <span className="financial-label">Total Pool</span>
                    <span className="financial-value">Rs. {(kameti.amount * kameti.membersCount).toLocaleString()}</span>
                  </div>
                  <div className="financial-item">
                    <span className="financial-label">Collected</span>
                    <span className="financial-value text-green">Rs. {calculateTotalCollected().toLocaleString()}</span>
                  </div>
                  <div className="financial-item">
                    <span className="financial-label">Pending</span>
                    <span className="financial-value text-yellow">Rs. {((kameti.amount * kameti.membersCount) - calculateTotalCollected()).toLocaleString()}</span>
                  </div>
                  <div className="financial-item">
                    <span className="financial-label">Per Member</span>
                    <span className="financial-value">Rs. {kameti.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* AI Risk Analysis */}
              <div className="overview-card">
                <h3 className="card-title">🤖 AI Risk Analysis</h3>
                {loadingRisk ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      width: '24px', 
                      height: '24px', 
                      border: '3px solid #e2e8f0', 
                      borderTop: '3px solid #3b82f6', 
                      borderRadius: '50%', 
                      animation: 'spin 0.8s linear infinite',
                      marginBottom: '12px'
                    }}></div>
                    <p style={{ color: '#64748b', fontSize: '14px' }}>Analyzing risk...</p>
                  </div>
                ) : kametiRisk ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: kametiRisk.riskLevel === 'low' ? '#10b981' : kametiRisk.riskLevel === 'medium' ? '#f59e0b' : kametiRisk.riskLevel === 'high' ? '#ef4444' : '#991b1b' }}>
                          {kametiRisk.riskScore}
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize', marginTop: '4px' }}>
                          {kametiRisk.riskLevel} Risk
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/risk-dashboard?kametiId=${kameti.kametiId || kameti._id}`)}
                        style={{
                          padding: '8px 16px',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#2563eb'}
                        onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                      >
                        View Details →
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px', lineHeight: '1.5' }}>
                      {kametiRisk.message}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Overdue:</span> <strong style={{ color: '#ef4444' }}>{kametiRisk.signals.overduePayments}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Disputes:</span> <strong style={{ color: '#f59e0b' }}>{kametiRisk.signals.openDisputes}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>
                      Risk analysis unavailable
                    </p>
                    {kameti && (kameti.kametiId || kameti._id) && (
                      <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
                        {kameti.kametiId ? `Kameti ID: ${kameti.kametiId}` : `Kameti ID: ${kameti._id}`}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        console.log('🔄 Manual retry triggered');
                        fetchKametiRisk();
                      }}
                      disabled={loadingRisk}
                      style={{
                        padding: '8px 16px',
                        background: loadingRisk ? '#cbd5e1' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: loadingRisk ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => !loadingRisk && (e.target.style.background = '#2563eb')}
                      onMouseOut={(e) => !loadingRisk && (e.target.style.background = '#3b82f6')}
                    >
                      {loadingRisk ? 'Loading...' : '🔄 Retry'}
                    </button>
                  </div>
                )}
              </div>

              {/* kameti info */}
              <div className="overview-card full-width">
                <h3 className="card-title">Kameti Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Created By</span>
                    <span className="info-value">{kameti.createdByName}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Start Date</span>
                    <span className="info-value">{new Date(kameti.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Payout Order</span>
                    <span className="info-value" style={{ textTransform: 'capitalize' }}>{kameti.payoutOrder}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Privacy</span>
                    <span className="info-value">{kameti.isPrivate ? 'Private' : 'Public'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Auto Reminders</span>
                    <span className="info-value">{kameti.autoReminders ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Late Fee</span>
                    <span className="info-value">Rs. {kameti.latePaymentFee || 0}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="overview-card full-width">
                <h3 className="card-title">Recent Activities</h3>
                {kameti?.activities && Array.isArray(kameti.activities) && kameti.activities.length > 0 ? (
                  <div className="activities-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {kameti.activities.slice(0, 10).map((activity, index) => (
                      <div key={index} className="activity-item" style={{
                        padding: '12px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: activity?.type === 'dispute_raised' ? '#fef3c7' : 
                                          activity?.type === 'payment' ? '#d1fae5' : '#e0e7ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {activity?.type === 'dispute_raised' ? '⚠️' : 
                           activity?.type === 'payment' ? '💰' : 
                           activity?.type === 'member_joined' ? '👥' : '📝'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>
                            {activity?.title || 'Activity'}
                          </p>
                          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            {activity?.message || ''}
                          </p>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {activity?.createdAt ? new Date(activity.createdAt).toLocaleString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                    No recent activities
                  </p>
                )}
              </div>
            </div>
          )}

          {/* members tab */}
          {activeTab === 'members' && (
            <div className="members-section">
              {kameti.members && kameti.members.length > 0 ? (
                <div className="members-grid">
                  {kameti.members.map((member, index) => (
                    <div key={index} className="member-card">
                      <div className="member-avatar">
                        {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div className="member-info">
                        <h4 className="member-name">{member.name || 'Member'}</h4>
                        <p className="member-email">{member.email}</p>
                        <span className="member-joined">Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="member-status">
                        <span className={`payment-badge ${member.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                          {member.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-members">
                  <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="empty-title">No Members Yet</h3>
                  <p className="empty-description">Invite members to join your kameti</p>
                  {isCreator && (
                    <button onClick={() => setShowInviteModal(true)} className="empty-action-btn">
                      Invite Members
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* join requests tab (admin only) */}
          {activeTab === 'requests' && isCreator && (
            <div className="requests-section">
              <div className="requests-header">
                <h3 className="requests-title">Join Requests</h3>
                <p className="requests-subtitle">
                  {kameti.joinRequests?.filter(r => r.status === 'pending').length || 0} pending request(s)
                </p>
              </div>

              {kameti.joinRequests && kameti.joinRequests.filter(r => r.status === 'pending').length > 0 ? (
                <div className="requests-list">
                  {kameti.joinRequests
                    .filter(r => r.status === 'pending')
                    .map((request) => (
                      <div key={request._id} className="request-card">
                        <div className="request-avatar">
                          {request.name ? request.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="request-info">
                          <h4 className="request-name">{request.name || 'User'}</h4>
                          <p className="request-email">{request.email}</p>
                          {request.message && (
                            <p className="request-message">"{request.message}"</p>
                          )}
                          <span className="request-date">
                            Requested {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="request-actions">
                          <button 
                            onClick={() => handleApproveRequest(request._id)} 
                            className="request-btn approve"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button 
                            onClick={() => handleRejectRequest(request._id)} 
                            className="request-btn reject"
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="empty-state-requests">
                  <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <h3 className="empty-title">No Pending Requests</h3>
                  <p className="empty-description">All join requests have been processed</p>
                </div>
              )}
            </div>
          )}

          {/* payments tab */}
          {/* disputes tab */}
          {activeTab === 'disputes' && kameti && (
            <div className="disputes-section" style={{ padding: '24px' }}>
              {/* Debug log for isCreator visibility */}
              {(() => {
                fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KametiDetails.jsx:disputes-tab',message:'Disputes tab render',data:{isCreator,isMember,userId:user?._id||user?.id,createdBy:kameti?.createdBy},timestamp:Date.now(),sessionId:'debug-session',runId:'run-admin',hypothesisId:'admin-visibility'})}).catch(()=>{});
                return null;
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>Disputes</h3>
                  {disputes.length > 0 && (
                    <span style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {disputes.length} {disputes.length === 1 ? 'Dispute' : 'Disputes'}
                    </span>
                  )}
                  {isCreator && disputes.length > 0 && (
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '12px',
                      padding: '4px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Admin Review
                    </span>
                  )}
                </div>
                {user && (
                  <button
                    onClick={() => {
                      navigate('/raise-dispute', { state: { kametiId: kameti.kametiId, kametiMongoId: kameti._id } });
                    }}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Raise Dispute
                  </button>
                )}
              </div>

              {loadingDisputes ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <p>Loading disputes...</p>
                </div>
              ) : disputes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>No Disputes</h3>
                  <p style={{ color: '#64748b', marginBottom: '16px' }}>No disputes have been raised for this Kameti yet.</p>
                  {user && kameti && (
                    <button
                      onClick={() => navigate('/raise-dispute', { state: { kametiId: kameti.kametiId, kametiMongoId: kameti._id } })}
                      style={{
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Raise First Dispute
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {disputes.map(dispute => (
                    <div
                      key={dispute._id}
                      style={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                        e.currentTarget.style.borderColor = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                      onClick={() => !isCreator && navigate(`/my-disputes`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                              Case: {dispute.caseId}
                            </h4>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: dispute.status === 'open' ? '#dbeafe' : 
                                            dispute.status === 'resolved' ? '#d1fae5' : 
                                            dispute.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                              color: dispute.status === 'open' ? '#1e40af' : 
                                     dispute.status === 'resolved' ? '#065f46' : 
                                     dispute.status === 'rejected' ? '#991b1b' : '#92400e'
                            }}>
                              {dispute.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                            {dispute.reasonLabel}
                          </p>
                          <p style={{ fontSize: '14px', color: '#1e293b' }}>
                            By: {dispute.userName || dispute.userEmail}
                          </p>
                          {isCreator && (
                            <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              You received a notification about this dispute
                            </p>
                          )}
                          {!isCreator && isMember && (
                            <p style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              You received a notification about this dispute
                            </p>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p style={{ fontSize: '14px', color: '#475569', marginTop: '12px', lineHeight: '1.5' }}>
                        {dispute.explanation.length > 150 ? dispute.explanation.substring(0, 150) + '...' : dispute.explanation}
                      </p>
                      {dispute.proof && dispute.proof.length > 0 && (
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                          📎 {dispute.proof.length} proof file(s) attached
                        </p>
                      )}
                      
                      {/* Admin Actions - Only visible to creator */}
                      {/* #region agent log */}
                      {(() => {
                        fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'KametiDetails.jsx:1249',message:'Checking admin buttons visibility',data:{isCreator,disputeCaseId:dispute.caseId,disputeStatus:dispute.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run-admin',hypothesisId:'admin-visibility'})}).catch(()=>{});
                        return null;
                      })()}
                      {/* #endregion */}
                      {isCreator && (
                        <div style={{ 
                          marginTop: '16px', 
                          paddingTop: '16px', 
                          borderTop: '2px solid #3b82f6',
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                          backgroundColor: '#f8fafc',
                          padding: '12px',
                          borderRadius: '8px'
                        }}>
                          <div style={{ width: '100%', marginBottom: '8px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase' }}>
                              Admin Actions
                            </p>
                          </div>
                          {dispute.status === 'open' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkUnderReview(dispute.caseId);
                              }}
                              style={{
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#d97706';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#f59e0b';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Working on it
                            </button>
                          )}
                          {(dispute.status === 'open' || dispute.status === 'under_review') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDispute(dispute);
                                  setShowResolveModal(true);
                                }}
                                style={{
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#059669';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#10b981';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Resolve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDispute(dispute);
                                  setShowRejectModal(true);
                                }}
                                style={{
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '8px 16px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#dc2626';
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#ef4444';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDispute(dispute.caseId);
                            }}
                            style={{
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 4px rgba(107, 114, 128, 0.3)',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#4b5563';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#6b7280';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-section">
              <div className="payments-header">
                <h3 className="payments-title">Payment History</h3>
                <button className="export-btn">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
        </div>

              <div className="payments-table-wrapper">
                <table className="payments-table">
          <thead>
            <tr>
                      <th>Member</th>
                      <th>Round</th>
                      <th>Amount</th>
                      <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
                    {kameti.members && kameti.members.length > 0 ? (
                      kameti.members.map((member, index) => (
                        <tr key={index}>
                          <td>
                            <div className="table-member">
                              <div className="table-avatar">{member.name ? member.name.charAt(0) : 'M'}</div>
                              <div>
                                <div className="table-name">{member.name || 'Member'}</div>
                                <div className="table-email">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>{kameti.currentRound}</td>
                          <td className="table-amount">Rs. {kameti.amount.toLocaleString()}</td>
                          <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`table-status-badge ${member.paymentStatus}`}>
                              {member.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                </td>
              </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty">No payment records yet</td>
                      </tr>
                    )}
          </tbody>
        </table>
              </div>
            </div>
          )}

          {/* settings tab */}
          {activeTab === 'settings' && isCreator && (
            <div className="settings-section">
              <div className="settings-card">
                <h3 className="settings-title">Kameti Settings</h3>
                <p className="settings-description">Manage your kameti configuration and preferences</p>
                
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <h4 className="setting-label">Status</h4>
                      <p className="setting-desc">Current kameti status</p>
                    </div>
                    <select className="setting-select" defaultValue={kameti.status} disabled>
                      <option value="Pending">Pending</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Closed">Closed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    {kameti.status === 'Closed' && (
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Status cannot be changed. Kameti is closed.
                      </p>
                    )}
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4 className="setting-label">Auto Reminders</h4>
                      <p className="setting-desc">Send automatic payment reminders</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked={kameti.autoReminders} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="setting-item">
                    <div className="setting-info">
                      <h4 className="setting-label">Privacy</h4>
                      <p className="setting-desc">Make kameti private or public</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked={kameti.isPrivate} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>


                <div className="settings-actions">
                  {kameti.status !== 'Closed' && !kameti.deleteRequest && isCreator && (
                    <>
                      <button className="settings-save-btn">Save Changes</button>
                      <button
                        onClick={() => {
                          setDeleteReason('');
                          setShowDeleteModal(true);
                        }}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          marginLeft: '12px'
                        }}
                      >
                        🗑️ Delete Kameti
                      </button>
                    </>
                  )}
                  {kameti.status === 'Closed' && isCreator && (
                    <button 
                      className="settings-delete-btn"
                      onClick={() => {
                        setShowDeleteModal(true);
                      }}
                      style={{ 
                        background: '#ef4444', 
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      🗑️ Delete Closed Kameti
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => {
          setShowDeleteModal(false);
          setDeleteReason('');
        }}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ padding: '24px' }}>
              <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>
                {kameti?.status === 'Closed' ? 'Delete Closed Kameti' : 'Request Kameti Deletion'}
              </h2>
              
              {kameti?.status === 'Closed' ? (
                <>
                  <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                    Are you sure you want to permanently delete this closed kameti? This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteReason('');
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const storedUser = localStorage.getItem('ekametiUser');
                          const user = storedUser ? JSON.parse(storedUser) : null;
                          const userId = user?._id || user?.id;
                          const response = await axios.delete(getApiUrl(`kameti/delete/${kameti._id}?userId=${userId}`), {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (response.data.success) {
                            alert('✅ Kameti deleted successfully');
                            navigate('/my-kametis');
                          }
                        } catch (error) {
                          alert(`❌ Failed to delete kameti: ${error.response?.data?.message || error.message}`);
                        } finally {
                          setShowDeleteModal(false);
                          setDeleteReason('');
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      Delete Permanently
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                    Requesting deletion will require approval from all members before the kameti can be deleted. This action cannot be undone once approved.
                  </p>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      Reason for deletion (optional):
                    </label>
                    <textarea
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Enter reason for deletion request..."
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteReason('');
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token');
                          const storedUser = localStorage.getItem('ekametiUser');
                          const user = storedUser ? JSON.parse(storedUser) : null;
                          const response = await axios.post(getApiUrl(`kameti/request-delete/${kameti._id}`), {
                            userId: user?._id || user?.id,
                            reason: deleteReason.trim() || undefined
                          }, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (response.data.success) {
                            alert('✅ Deletion request created. All members must approve before kameti can be deleted.');
                            fetchKametiDetails(); // Refresh
                            setShowDeleteModal(false);
                            setDeleteReason('');
                          }
                        } catch (error) {
                          alert(`❌ Failed: ${error.response?.data?.message || error.message}`);
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                      }}
                    >
                      Request Deletion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* invite modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Invite Members</h3>
              <button onClick={() => setShowInviteModal(false)} className="modal-close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="invite-option">
                <h4 className="invite-option-title">Share Link</h4>
                <div className="invite-link-box">
                  <input 
                    type="text" 
                    value={`${window.location.origin}/join-kameti/${id}`} 
                    readOnly 
                    className="invite-link-input"
                  />
                  <button onClick={copyInviteLink} className="copy-link-btn">
                    {copiedLink ? (
                      <>
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-divider">OR</div>

              <div className="invite-option">
                <h4 className="invite-option-title">Send via Email</h4>
                <input 
                  type="email" 
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="invite-email-input"
                />
                <button className="send-invite-btn">Send Invitation</button>
              </div>
            </div>
      </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="modal-overlay" onClick={() => {
          setShowResolveModal(false);
          setSelectedDispute(null);
          setResolveData({ resolutionType: '', resolutionAmount: '', resolutionNotes: '' });
        }}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Resolve Dispute</h3>
              <button onClick={() => {
                setShowResolveModal(false);
                setSelectedDispute(null);
                setResolveData({ resolutionType: '', resolutionAmount: '', resolutionNotes: '' });
              }} className="modal-close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                  Case: <strong>{selectedDispute.caseId}</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Reason: {selectedDispute.reasonLabel}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                  Resolution Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={resolveData.resolutionType}
                  onChange={(e) => setResolveData({ ...resolveData, resolutionType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select resolution type</option>
                  <option value="refund">Refund</option>
                  <option value="penalty">Penalty</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="no_action">No Action</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                  Resolution Amount (Optional)
                </label>
                <input
                  type="number"
                  value={resolveData.resolutionAmount}
                  onChange={(e) => setResolveData({ ...resolveData, resolutionAmount: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                  Resolution Notes <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={resolveData.resolutionNotes}
                  onChange={(e) => setResolveData({ ...resolveData, resolutionNotes: e.target.value })}
                  placeholder="Enter resolution details..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowResolveModal(false);
                    setSelectedDispute(null);
                    setResolveData({ resolutionType: '', resolutionAmount: '', resolutionNotes: '' });
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#64748b',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Resolve Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dispute Modal */}
      {showRejectModal && selectedDispute && (
        <div className="modal-overlay" onClick={() => {
          setShowRejectModal(false);
          setSelectedDispute(null);
          setRejectionNotes('');
        }}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Dispute</h3>
              <button onClick={() => {
                setShowRejectModal(false);
                setSelectedDispute(null);
                setRejectionNotes('');
              }} className="modal-close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>
                  Case: <strong>{selectedDispute.caseId}</strong>
                </p>
                <p style={{ fontSize: '14px', color: '#64748b' }}>
                  Reason: {selectedDispute.reasonLabel}
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1e293b' }}>
                  Rejection Notes <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedDispute(null);
                    setRejectionNotes('');
                  }}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#64748b',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectDispute}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Reject Dispute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KametiDetails;
