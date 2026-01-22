import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import NavBar from '../components/NavBar';

export default function PayoutManagement() {
  const { kametiId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [eligibleRecipients, setEligibleRecipients] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [memberStatus, setMemberStatus] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [kameti, setKameti] = useState(null);
  const [isCreator, setIsCreator] = useState(false);

  const token = useMemo(() => localStorage.getItem('token'), []);
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);
  
  // Get current user
  const user = useMemo(() => {
    try {
      const stored = localStorage.getItem('ekametiUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load readiness and eligible recipients
      const readinessRes = await axios.get(getApiUrl(`/payouts/check-readiness/${kametiId}`), {
        headers: authHeaders
      });
      setReadiness(readinessRes.data.readiness);
      setEligibleRecipients(readinessRes.data.eligibleRecipients || []);
      // Set isCreator from backend response
      setIsCreator(readinessRes.data.isCreator || false);

      // Load payout history
      const historyRes = await axios.get(getApiUrl(`/payouts/history/${kametiId}`), {
        headers: authHeaders
      });
      setPayoutHistory(historyRes.data.payouts || []);

      // Load payment history (same as Payments History in KametiDetails)
      try {
        const paymentHistoryRes = await axios.get(getApiUrl(`/payments/kameti/${kametiId}`), {
          headers: authHeaders
        });
        setPaymentHistory(paymentHistoryRes.data.payments || []);
      } catch (paymentError) {
        console.warn('Failed to load payment history:', paymentError.message);
        setPaymentHistory([]);
      }

      // Load kameti details to get member status and check if user is creator
      try {
        const kametiRes = await axios.get(getApiUrl(`/kameti/${kametiId}`), {
          headers: authHeaders
        });
        if (kametiRes.data) {
          setKameti(kametiRes.data);
          if (kametiRes.data.members) {
            setMemberStatus(kametiRes.data.members);
          }
          // isCreator is now set from check-readiness endpoint
        }
      } catch (kametiError) {
        console.warn('Failed to load kameti details for member status:', kametiError.message);
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load payout data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (kametiId) loadData();
  }, [kametiId, authHeaders, token]);

  const processPayout = async () => {
    if (!readiness?.ready) {
      alert('⏳ All members must pay before releasing payout.');
      return;
    }
    if (!isCreator) {
      alert('❌ Only the admin can release payouts.');
      return;
    }
    
    const confirmRelease = window.confirm(
      `Are you sure you want to release the payout for Round ${readiness.round}?\n\n` +
      `Pool Amount: Rs. ${readiness.poolAmount?.toLocaleString() || '0'}\n` +
      `All ${readiness.paidCount} members have paid.`
    );
    
    if (!confirmRelease) return;
    
    setProcessing(true);
    setError('');
    try {
      const res = await axios.post(getApiUrl(`/payouts/process/${kametiId}`), {}, { headers: authHeaders });
      
      if (res.data.isCompleted) {
        alert(`✅ Payout released successfully!\n\nKameti is now completed and closed. All rounds finished.`);
      } else {
        alert(`✅ Payout released successfully!\n\nRound ${res.data.nextRound} has started. All members can now make payments for the next round.`);
      }
      
      await loadData(); // Reload all data
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to process payout';
      setError(msg);
      alert(`❌ ${msg}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!kametiId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payout Management</h2>
            <p className="text-red-600">Missing kametiId in URL.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">💰 Payout Management</h1>
            <p className="text-gray-600 mt-1">Manage payouts and track payment status</p>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading payout status…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
            {error}
          </div>
        ) : (
          <>
            {/* Kameti Closed Banner */}
            {(readiness?.kametiStatus === 'Closed' || readiness?.kametiStatus === 'Completed') && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-6 text-center shadow-lg">
                <div className="text-2xl font-bold mb-2">🔒 Kameti Closed</div>
                <div className="text-green-50">
                  All rounds have been completed. All members have received their payouts. This kameti is now closed.
                </div>
              </div>
            )}

            {/* Round Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Current Round</div>
                <div className="text-2xl font-bold text-gray-900">
                  {readiness?.round || '-'} / {readiness?.totalRounds || '-'}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Status</div>
                <div className={`text-2xl font-bold ${readiness?.ready ? 'text-green-600' : 'text-red-600'}`}>
                  {readiness?.ready ? '✅ Ready' : '⏳ Not Ready'}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Pool Amount</div>
                <div className="text-2xl font-bold text-green-600">
                  Rs. {readiness?.poolAmount?.toLocaleString() || '0'}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">Paid / Total</div>
                <div className="text-2xl font-bold text-gray-900">
                  {readiness?.paidCount || 0} / {readiness?.totalMembers || 0}
                </div>
              </div>
            </div>

            {/* Ready for Payout Banner */}
            {readiness?.ready && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 mb-6 text-center shadow-lg">
                <div className="text-white text-lg font-semibold mb-4">
                  🎉 All members have paid! Ready to release payout.
                </div>
              </div>
            )}

            {/* Release Payout Button - ALWAYS VISIBLE */}
            <div className="mb-6">
              <button
                onClick={processPayout}
                disabled={processing || !readiness?.ready || !isCreator}
                className={`w-full px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                  readiness?.ready && isCreator
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-[1.02]'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {processing ? 'Processing…' : readiness?.ready && isCreator ? '🚀 Release Payout' : !isCreator ? '⏳ Only Admin Can Release' : '⏳ Waiting for All Members to Pay'}
              </button>
            </div>

            {/* Reason/Message */}
            {readiness?.reason && !readiness?.ready && (
              <div className={`rounded-lg p-4 mb-6 ${readiness.ready ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="font-semibold mb-1">{readiness.ready ? '✅ Ready for Payout' : '⏳ Waiting'}</div>
                <div className="text-gray-700 text-sm">{readiness.reason}</div>
              </div>
            )}

            {/* View-only message for non-admin users */}
            {!loading && kameti && !isCreator && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                <p className="text-blue-800 text-sm">
                  👁️ View Only Mode - You can view payout information but cannot make changes. Only the admin can release payouts.
                </p>
              </div>
            )}

            {/* Member Payment Status - Using same data as Payments History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Payment Status</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Round</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.length > 0 ? (
                      paymentHistory.map((payment, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                                {payment.userId?.fullName ? payment.userId.fullName.charAt(0).toUpperCase() : (payment.userId?.email ? payment.userId.email.charAt(0).toUpperCase() : 'M')}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{payment.userId?.fullName || payment.userId?.email || 'Member'}</div>
                                <div className="text-xs text-gray-600">{payment.userId?.email || ''}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{payment.round || kameti?.currentRound || '-'}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                            Rs. {payment.amount?.toLocaleString() || kameti?.amount?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              payment.status === 'paid' || payment.status === 'completed'
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {payment.status === 'paid' || payment.status === 'completed' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : kameti?.members && kameti.members.length > 0 ? (
                      kameti.members.map((member, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                                {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{member.name || 'Member'}</div>
                                <div className="text-xs text-gray-600">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{kameti.currentRound || '-'}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                            Rs. {kameti.amount?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              member.paymentStatus === 'paid' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {member.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-gray-500">No payment records yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Eligible Recipients */}
            {eligibleRecipients.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Eligible Recipients ({eligibleRecipients.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {eligibleRecipients.map((recipient, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
                      <div className="font-semibold text-sm text-gray-900">{recipient.name || recipient.email}</div>
                      <div className="text-xs text-gray-600">{recipient.email}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h3>
              {payoutHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No payout history yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Round</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Recipient</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutHistory.map((payout) => (
                        <tr key={payout._id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">Round {payout.round}</td>
                          <td className="py-3 px-4 text-sm">
                            <div className="text-gray-900">{payout.recipientName || payout.recipientEmail}</div>
                            <div className="text-xs text-gray-600">{payout.recipientEmail}</div>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-semibold text-green-600">
                            Rs. {payout.amount?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              payout.status === 'completed' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {payout.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {payout.createdAt ? new Date(payout.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
