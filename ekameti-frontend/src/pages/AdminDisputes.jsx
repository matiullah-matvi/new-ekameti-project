import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import NavBar from '../components/NavBar';

const AdminDisputes = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [priority, setPriority] = useState('all');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    resolutionType: '',
    resolutionAmount: '',
    resolutionNotes: ''
  });
  const [rejectionNotes, setRejectionNotes] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, [filter, priority]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (priority !== 'all') params.priority = priority;

      const response = await axios.get(getApiUrl('disputes/admin/all'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setDisputes(response.data.disputes || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisputeDetails = async (caseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`disputes/admin/${caseId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedDispute(response.data);
    } catch (error) {
      console.error('Error fetching dispute details:', error);
    }
  };

  const handleMarkUnderReview = async (caseId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(getApiUrl(`disputes/admin/${caseId}/review`), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchDisputes();
      if (selectedDispute?.dispute?.caseId === caseId) {
        fetchDisputeDetails(caseId);
      }
    } catch (error) {
      console.error('Error marking under review:', error);
      alert(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleResolve = async () => {
    if (!resolutionData.resolutionType || !resolutionData.resolutionNotes) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`disputes/admin/${selectedDispute.dispute.caseId}/resolve`),
        {
          resolutionType: resolutionData.resolutionType,
          resolutionAmount: parseFloat(resolutionData.resolutionAmount) || 0,
          resolutionNotes: resolutionData.resolutionNotes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowResolveModal(false);
      setResolutionData({ resolutionType: '', resolutionAmount: '', resolutionNotes: '' });
      fetchDisputes();
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error resolving dispute:', error);
      alert(error.response?.data?.message || 'Failed to resolve dispute');
    }
  };

  const handleReject = async () => {
    if (!rejectionNotes) {
      alert('Please provide rejection notes');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`disputes/admin/${selectedDispute.dispute.caseId}/reject`),
        { rejectionNotes },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowRejectModal(false);
      setRejectionNotes('');
      fetchDisputes();
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error rejecting dispute:', error);
      alert(error.response?.data?.message || 'Failed to reject dispute');
    }
  };

  const handleUpdatePriority = async (caseId, newPriority) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        getApiUrl(`disputes/admin/${caseId}/priority`),
        { priority: newPriority },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      fetchDisputes();
      if (selectedDispute?.dispute?.caseId === caseId) {
        fetchDisputeDetails(caseId);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-white">
            <p>Loading disputes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dispute Management</h1>
          <p className="text-gray-300">Review and resolve user disputes</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Disputes List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Disputes List */}
            <div className="space-y-4">
              {disputes.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <p className="text-gray-600">No disputes found</p>
                </div>
              ) : (
                disputes.map(dispute => (
                  <div
                    key={dispute._id}
                    className={`bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow ${
                      selectedDispute?.dispute?.caseId === dispute.caseId ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => fetchDisputeDetails(dispute.caseId)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{dispute.caseId}</h3>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(dispute.status)}`}>
                            {dispute.status.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(dispute.priority)}`}>
                            {dispute.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{dispute.reasonLabel}</p>
                        <p className="text-sm text-gray-500 mt-1">By: {dispute.userName}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDate(dispute.createdAt)}</p>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{dispute.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispute Details Panel */}
          <div className="lg:col-span-1">
            {selectedDispute ? (
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Dispute Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Case ID</p>
                    <p className="font-semibold">{selectedDispute.dispute.caseId}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(selectedDispute.dispute.status)}`}>
                      {selectedDispute.dispute.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Priority</p>
                    <select
                      value={selectedDispute.dispute.priority}
                      onChange={(e) => handleUpdatePriority(selectedDispute.dispute.caseId, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">User</p>
                    <p className="font-semibold">{selectedDispute.dispute.userName}</p>
                    <p className="text-xs text-gray-600">{selectedDispute.dispute.userEmail}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Kameti</p>
                    <p className="font-semibold">{selectedDispute.dispute.kametiName}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="font-semibold">{selectedDispute.dispute.reasonLabel}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Explanation</p>
                    <p className="text-sm text-gray-700">{selectedDispute.dispute.explanation}</p>
                  </div>

                  {selectedDispute.dispute.proof && selectedDispute.dispute.proof.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Proof Files</p>
                      {selectedDispute.dispute.proof.map((file, index) => (
                        <a
                          key={index}
                          href={`${getApiUrl('').replace('/api', '')}/uploads/disputes/${file.filename}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:text-blue-800 mb-1"
                        >
                          {file.originalName}
                        </a>
                      ))}
                    </div>
                  )}

                  {selectedDispute.paymentLogs && selectedDispute.paymentLogs.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Payment Logs</p>
                      <div className="bg-gray-50 rounded p-3 text-xs">
                        {selectedDispute.paymentLogs.map((log, index) => (
                          <div key={index} className="mb-2">
                            <p>Amount: Rs. {log.amount}</p>
                            <p>Status: {log.status}</p>
                            <p>Date: {formatDate(log.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {selectedDispute.dispute.status === 'open' && (
                    <button
                      onClick={() => handleMarkUnderReview(selectedDispute.dispute.caseId)}
                      className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Mark Under Review
                    </button>
                  )}

                  {selectedDispute.dispute.status === 'under_review' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowResolveModal(true)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Resolve Dispute
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Dispute
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <p className="text-gray-600">Select a dispute to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Resolve Dispute</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Type</label>
                  <select
                    value={resolutionData.resolutionType}
                    onChange={(e) => setResolutionData({ ...resolutionData, resolutionType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select type</option>
                    <option value="refund">Refund</option>
                    <option value="penalty">Penalty</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="no_action">No Action</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (if applicable)</label>
                  <input
                    type="number"
                    value={resolutionData.resolutionAmount}
                    onChange={(e) => setResolutionData({ ...resolutionData, resolutionAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes *</label>
                  <textarea
                    value={resolutionData.resolutionNotes}
                    onChange={(e) => setResolutionData({ ...resolutionData, resolutionNotes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter resolution details..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResolveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Reject Dispute</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Notes *</label>
                  <textarea
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter reason for rejection..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDisputes;






