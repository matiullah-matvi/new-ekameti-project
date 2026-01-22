import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const RiskAnalysisCard = ({ userId, title = 'Risk Analysis' }) => {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRisk();
  }, [userId]);

  const fetchRisk = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const endpoint = userId ? `risk/user/${userId}` : 'risk/me';
      const res = await axios.get(getApiUrl(endpoint), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRisk(res.data.risk);
    } catch (err) {
      console.error('Risk fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch risk');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level) => {
    switch (level) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'critical': return '#991b1b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-gray-600 text-sm">Loading risk...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow p-4 border border-red-200">
        <p className="text-red-600 text-sm">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h3 className="text-xl font-bold text-gray-900 capitalize">{risk?.riskLevel} risk</h3>
        </div>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            backgroundColor: riskColor(risk?.riskLevel),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            fontWeight: '700',
          }}
        >
          {risk?.riskScore}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Payment Reliability</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(risk?.factors?.paymentReliability || 0)} / 100
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Dispute Risk</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(risk?.factors?.disputeRisk || 0)} / 100
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Profile Completeness</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(risk?.factors?.profileCompleteness || 0)} / 100
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Financial Load</p>
          <p className="text-lg font-semibold text-gray-900">
            {Math.round(risk?.factors?.financialLoad || 0)} / 100
          </p>
        </div>
      </div>

      {risk?.recommendations?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Recommendations</p>
          <div className="space-y-2">
            {risk.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border"
                style={{ borderColor: riskColor(risk.riskLevel) }}
              >
                <p className="text-sm text-gray-800">{rec.message}</p>
                <p className="text-xs text-gray-500 capitalize">Priority: {rec.priority}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAnalysisCard;











