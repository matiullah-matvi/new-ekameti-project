import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const P2PLoanDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const kametiId = searchParams.get('kametiId');
  const pledgeStatus = searchParams.get('pledge');

  const [loan, setLoan] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledging, setPledging] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('ekametiUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (pledgeStatus === 'success') {
      setSuccess('Payment successful! Your pledge has been recorded.');
    } else if (pledgeStatus === 'cancelled') {
      setError('Payment was cancelled. Please try again if you wish to pledge.');
    }

    loadLoanDetails();
  }, [id]);

  const loadLoanDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`p2p/loans/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setLoan(response.data.loan);
        setPledges(response.data.pledges || []);
        setRepayments(response.data.repayments || []);
      }
    } catch (error) {
      console.error('Error loading loan details:', error);
      setError(error.response?.data?.message || 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  const handlePledge = async (e) => {
    e.preventDefault();
    if (!pledgeAmount || Number(pledgeAmount) <= 0) {
      setError('Please enter a valid pledge amount');
      return;
    }

    try {
      setPledging(true);
      setError('');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl(`p2p/loans/${id}/pledge`),
        {
          amount: Number(pledgeAmount),
          kametiId: kametiId || loan?.kametiId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success && response.data.paymentUrl) {
        // Redirect to PayFast payment page
        window.location.href = response.data.paymentUrl;
      }
    } catch (error) {
      console.error('Error creating pledge:', error);
      setError(error.response?.data?.message || 'Failed to create pledge');
      setPledging(false);
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

  const getProgressPercentage = () => {
    if (!loan || !loan.targetAmount || loan.targetAmount === 0) return 0;
    return Math.min(100, ((loan.fundedAmount || 0) / loan.targetAmount) * 100);
  };

  const isBorrower = user && loan && (user._id === loan.borrowerId?.toString() || user.id === loan.borrowerId?.toString());
  const canPledge = loan && loan.status === 'open' && !isBorrower;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading loan details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error || 'Loan not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
          <button
            onClick={() => navigate(kametiId ? `/p2p/loans?kametiId=${kametiId}` : '/p2p')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Loan Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loan Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{loan.purpose}</h2>
                  <p className="text-sm text-gray-600">Kameti ID: {loan.kametiId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(loan.status)}`}>
                  {loan.status}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Loan Amount</p>
                  <p className="text-xl font-bold text-gray-900">Rs. {loan.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Target Amount</p>
                  <p className="text-xl font-bold text-gray-900">Rs. {(loan.targetAmount || loan.amount).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="text-lg font-semibold text-gray-900">{loan.termMonths} months</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Interest Rate</p>
                  <p className="text-lg font-semibold text-gray-900">{loan.interestRate || 0}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              {loan.targetAmount && loan.targetAmount > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Funding Progress</span>
                    <span className="font-semibold text-gray-900">
                      Rs. {(loan.fundedAmount || 0).toLocaleString()} / Rs. {loan.targetAmount.toLocaleString()}
                      {' '}({Math.round(getProgressPercentage())}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage()}%` }}
                    ></div>
                  </div>
                </div>
              )}

            </div>

            {/* Pledges */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pledges ({pledges.length})</h3>
              {pledges.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pledges yet</p>
              ) : (
                <div className="space-y-3">
                  {pledges.map((pledge) => (
                    <div key={pledge._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">Rs. {pledge.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(pledge.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          pledge.status === 'paid' ? 'bg-green-100 text-green-800' :
                          pledge.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {pledge.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Repayments */}
            {repayments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Repayment Schedule</h3>
                <div className="space-y-3">
                  {repayments.map((repayment) => (
                    <div key={repayment._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Rs. {repayment.amountDue.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Due: {new Date(repayment.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          repayment.status === 'paid' ? 'bg-green-100 text-green-800' :
                          repayment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {repayment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Pledge Form */}
          <div className="lg:col-span-1">
            {canPledge && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Make a Pledge</h3>
                <form onSubmit={handlePledge} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Pledge Amount (Rs.)
                    </label>
                    <input
                      type="text"
                      value={pledgeAmount}
                      onChange={(e) => setPledgeAmount(e.target.value.replace(/\D/g, ''))}
                      placeholder="1000"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Remaining: Rs. {((loan.targetAmount || loan.amount) - (loan.fundedAmount || 0)).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={pledging}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pledging ? 'Processing...' : 'Pledge & Pay'}
                  </button>
                </form>
              </div>
            )}

            {isBorrower && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <p className="text-sm text-blue-800">
                  <strong>You are the borrower</strong> of this loan. You cannot pledge to your own loan.
                </p>
              </div>
            )}

            {loan.status !== 'open' && !isBorrower && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <p className="text-sm text-gray-600">
                  This loan is {loan.status} and is not accepting new pledges.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default P2PLoanDetail;
