import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import NavBar from '../components/NavBar';
import { useTranslation } from '../hooks/useTranslation';

const MyDisputes = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDisputes();
  }, [filter]);

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const params = filter !== 'all' ? { status: filter } : {};
      
      const response = await axios.get(getApiUrl('disputes/my-disputes'), {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setDisputes(response.data.disputes || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setError(error.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
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
      case 'closed':
        return 'bg-gray-100 text-gray-800';
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Disputes</h1>
            <p className="text-gray-300">Track and manage your dispute cases</p>
          </div>
          <button
            onClick={() => navigate('/raise-dispute')}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
          >
            + Raise New Dispute
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 bg-white rounded-lg p-2">
          {['all', 'open', 'under_review', 'resolved', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Disputes List */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">
            {error}
          </div>
        )}

        {disputes.length === 0 && !error ? (
          <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Disputes Found</h3>
            <p className="text-gray-600 mb-6">
              No disputes for this account{filter !== 'all' ? ` with filter "${filter.replace('_',' ')}"` : ''}.
            </p>
            <button
              onClick={() => navigate('/raise-dispute')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
            >
              Raise Your First Dispute
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map(dispute => (
              <div
                key={dispute._id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => navigate(`/dispute/${dispute.caseId}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">Case: {dispute.caseId}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(dispute.status)}`}>
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600">{dispute.reasonLabel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(dispute.createdAt)}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Kameti</p>
                  <p className="font-medium text-gray-900">
                    {dispute.kametiMongoId?.name || dispute.kametiName} ({dispute.kametiId})
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Explanation</p>
                  <p className="text-gray-700 line-clamp-2">{dispute.explanation}</p>
                </div>

                {dispute.proof && dispute.proof.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Proof Attached: {dispute.proof.length} file(s)</p>
                  </div>
                )}

                {dispute.resolution && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Resolution</p>
                    <p className="text-sm text-gray-700">{dispute.resolutionNotes}</p>
                    {dispute.resolutionAmount > 0 && (
                      <p className="text-sm font-medium text-green-600 mt-2">
                        Amount: Rs. {dispute.resolutionAmount}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {dispute.daysOpen || Math.ceil((new Date() - new Date(dispute.createdAt)) / (1000 * 60 * 60 * 24))} days open
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dispute/${dispute.caseId}`);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDisputes;

