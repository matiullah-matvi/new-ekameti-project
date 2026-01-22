import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const P2PLoanList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kametiId = searchParams.get('kametiId');

  const [kameti, setKameti] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('open');

  useEffect(() => {
    if (kametiId) {
      loadKameti();
      loadLoans();
    } else {
      setError('Kameti ID is required');
      setLoading(false);
    }
  }, [kametiId, filterStatus]);

  const loadKameti = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`kameti/${kametiId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKameti(response.data);
    } catch (error) {
      console.error('Error loading kameti:', error);
    }
  };

  const loadLoans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        getApiUrl(`p2p/loans?kametiId=${kametiId}&status=${filterStatus}`),
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setLoans(response.data.loans || []);
    } catch (error) {
      console.error('Error loading loans:', error);
      setError(error.response?.data?.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-purple-100 text-purple-800';
      case 'repaying': return 'bg-amber-100 text-amber-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (loan) => {
    if (!loan.targetAmount || loan.targetAmount === 0) return 0;
    return Math.min(100, (loan.fundedAmount / loan.targetAmount) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Requests</h1>
            {kameti && (
              <p className="text-gray-600 mt-1">
                {kameti.name} ({kameti.kametiId})
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/p2p')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back
            </button>
            {kametiId && (
              <button
                onClick={() => navigate(`/p2p/create-loan?kametiId=${kametiId}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Create Loan
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700">Filter by Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="open">Open</option>
              <option value="funded">Funded</option>
              <option value="active">Active</option>
              <option value="repaying">Repaying</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Loans List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading loans...</p>
          </div>
        ) : loans.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-lg mb-2">No loans found</p>
            <p className="text-gray-500 text-sm mb-4">
              {filterStatus === 'open' 
                ? 'No open loan requests in this kameti yet.'
                : `No ${filterStatus} loans found.`}
            </p>
            {kametiId && (
              <button
                onClick={() => navigate(`/p2p/create-loan?kametiId=${kametiId}`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Loan Request
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {loans.map((loan) => (
              <div
                key={loan._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/p2p/loans/${loan._id}?kametiId=${kametiId}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{loan.purpose}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Amount: <strong className="text-gray-900">Rs. {loan.amount.toLocaleString()}</strong></span>
                      <span>Term: <strong className="text-gray-900">{loan.termMonths} months</strong></span>
                      {loan.interestRate > 0 && (
                        <span>Interest: <strong className="text-gray-900">{loan.interestRate}%</strong></span>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(loan.status)}`}>
                    {loan.status}
                  </span>
                </div>

                {/* Progress Bar */}
                {loan.targetAmount && loan.targetAmount > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">Funding Progress</span>
                      <span className="font-semibold text-gray-900">
                        Rs. {loan.fundedAmount?.toLocaleString() || 0} / Rs. {loan.targetAmount.toLocaleString()}
                        {' '}({Math.round(getProgressPercentage(loan))}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${getProgressPercentage(loan)}%` }}
                      ></div>
                    </div>
                  </div>
                )}


                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Created {new Date(loan.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/p2p/loans/${loan._id}?kametiId=${kametiId}`);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
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

export default P2PLoanList;
