import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import RiskAnalysisCard from '../components/RiskAnalysisCard';
import { getApiUrl } from '../config/api';
import { useNavigate } from 'react-router-dom';

const RiskDashboard = () => {
  const navigate = useNavigate();
  const [kametiId, setKametiId] = useState('');
  const [memberRisks, setMemberRisks] = useState([]);
  const [kametiRisk, setKametiRisk] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingKameti, setLoadingKameti] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [kametiError, setKametiError] = useState('');

  const fetchMemberRisks = async () => {
    if (!kametiId) return;
    try {
      setLoadingMembers(true);
      setMemberError('');
      setMemberRisks([]);
      const token = localStorage.getItem('token');
      const res = await axios.get(getApiUrl(`risk/kameti/${kametiId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMemberRisks(res.data.memberRisks || []);
    } catch (err) {
      console.error('Member risk fetch error:', err);
      setMemberError(err.response?.data?.message || 'Failed to load member risks');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchKametiRisk = async () => {
    if (!kametiId) return;
    try {
      setLoadingKameti(true);
      setKametiError('');
      setKametiRisk(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(getApiUrl(`risk/kameti-summary/${kametiId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKametiRisk(res.data.summary);
    } catch (err) {
      console.error('Kameti risk fetch error:', err);
      setKametiError(err.response?.data?.message || 'Failed to load kameti risk');
    } finally {
      setLoadingKameti(false);
    }
  };

  const riskBadgeColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const riskScoreColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'high': return 'text-red-600';
      case 'critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 AI Risk Analysis</h1>
            <p className="text-gray-600 mt-1">Advanced risk scoring using payment behavior, disputes, and profile data</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Left Column - User Risk Profile */}
          <div className="lg:col-span-1">
            <RiskAnalysisCard title="Your Risk Profile" />
          </div>

          {/* Right Column - Kameti Analysis */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Kameti Risk Analysis</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter a Kameti ID to analyze overall kameti risk and individual member risk scores. Only the kameti creator can view member details.
              </p>
              
              <div className="flex gap-3 mb-4">
                <input
                  value={kametiId}
                  onChange={(e) => setKametiId(e.target.value)}
                  placeholder="Enter Kameti ID (e.g., KAMETI-XXXX)"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={() => {
                    fetchMemberRisks();
                    fetchKametiRisk();
                  }}
                  disabled={!kametiId || loadingMembers || loadingKameti}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMembers || loadingKameti ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>

              {memberError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {memberError}
                </div>
              )}

              {kametiError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {kametiError}
                </div>
              )}

              {/* Kameti Summary Risk */}
              {kametiRisk && (
                <div className={`mb-6 p-6 rounded-xl border-2 ${
                  kametiRisk.riskLevel === 'low' ? 'bg-green-50 border-green-200' :
                  kametiRisk.riskLevel === 'medium' ? 'bg-amber-50 border-amber-200' :
                  kametiRisk.riskLevel === 'high' ? 'bg-red-50 border-red-200' :
                  'bg-red-100 border-red-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-1">{kametiRisk.kametiName}</h4>
                      <p className="text-sm text-gray-600">Kameti ID: {kametiRisk.kametiId}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold mb-2 ${riskScoreColor(kametiRisk.riskLevel)}`}>
                        {kametiRisk.riskScore}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${riskBadgeColor(kametiRisk.riskLevel)}`}>
                        {kametiRisk.riskLevel} Risk
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{kametiRisk.message}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Overdue</div>
                      <div className="text-lg font-bold text-red-600">{kametiRisk.signals.overduePayments}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Disputes</div>
                      <div className="text-lg font-bold text-amber-600">{kametiRisk.signals.openDisputes}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Members</div>
                      <div className="text-lg font-bold text-gray-900">{kametiRisk.signals.memberCount}</div>
                    </div>
                    <div className="bg-white/60 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Status</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{kametiRisk.signals.status}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Member Risks List */}
              {loadingMembers && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600">Analyzing member risks...</p>
                </div>
              )}

              {!loadingMembers && memberRisks.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Member Risk Scores ({memberRisks.length} members)
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {memberRisks.map((m) => (
                      <div key={m.userId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center flex-1">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-3">
                              {m.name ? m.name.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-900">{m.name || 'Member'}</p>
                              <p className="text-xs text-gray-500">{m.email}</p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className={`text-2xl font-bold mb-1 ${riskScoreColor(m.riskLevel)}`}>
                              {m.riskScore}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${riskBadgeColor(m.riskLevel)}`}>
                              {m.riskLevel}
                            </span>
                          </div>
                        </div>
                        {m.recommendations && m.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Recommendations:</p>
                            <ul className="space-y-1">
                              {m.recommendations.slice(0, 2).map((rec, idx) => (
                                <li key={idx} className="text-xs text-gray-600 flex items-start">
                                  <span className="mr-2 text-blue-600">•</span>
                                  <span>{rec.message}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loadingMembers && kametiId && memberRisks.length === 0 && !memberError && (
                <div className="text-center py-8 text-gray-500">
                  <p>No member risks found. Make sure you are the creator of this kameti.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Risk Factors Explanation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">How Risk Scoring Works</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">35%</span>
                Payment Reliability
              </h4>
              <p className="text-sm text-gray-600">
                Based on on-time payment rate, late payments, failed payments, and average days late.
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">20%</span>
                Dispute Risk
              </h4>
              <p className="text-sm text-gray-600">
                Calculated from total disputes, open disputes, and rejected disputes.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">15%</span>
                Profile Completeness
              </h4>
              <p className="text-sm text-gray-600">
                Considers CNIC verification, phone number, identity verification, and account age.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">15%</span>
                Financial Load
              </h4>
              <p className="text-sm text-gray-600">
                Ratio of active kametis to total payments, indicating financial capacity.
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 md:col-span-2">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <span className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-2">15%</span>
                Behavioral Patterns
              </h4>
              <p className="text-sm text-gray-600">
                Analysis of payment timing patterns and consistency in financial behavior.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Risk Levels:</strong>{' '}
              <span className="text-green-600 font-semibold">Low (0-29)</span>,{' '}
              <span className="text-amber-600 font-semibold">Medium (30-59)</span>,{' '}
              <span className="text-red-600 font-semibold">High (60-79)</span>,{' '}
              <span className="text-red-800 font-semibold">Critical (80-100)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
