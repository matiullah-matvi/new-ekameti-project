import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const P2PCreateLoan = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kametiIdFromUrl = searchParams.get('kametiId');

  const [kameti, setKameti] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    kametiId: kametiIdFromUrl || '',
    amount: '',
    targetAmount: '',
    termMonths: '',
    interestRate: '',
    purpose: '',
    scheduleType: 'amortized'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (kametiIdFromUrl) {
      loadKameti(kametiIdFromUrl);
      setFormData(prev => ({ ...prev, kametiId: kametiIdFromUrl }));
    } else {
      setLoading(false);
    }
  }, [kametiIdFromUrl]);

  const loadKameti = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl(`kameti/${id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKameti(response.data);
    } catch (error) {
      console.error('Error loading kameti:', error);
      setError('Failed to load kameti details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'targetAmount' || name === 'termMonths' || name === 'interestRate'
        ? value.replace(/\D/g, '') // Only numbers
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.kametiId) {
      setError('Kameti ID is required');
      return;
    }

    if (!formData.amount || !formData.termMonths || !formData.purpose) {
      setError('Amount, term, and purpose are required');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        getApiUrl('p2p/loans'),
        {
          ...formData,
          amount: Number(formData.amount),
          targetAmount: formData.targetAmount ? Number(formData.targetAmount) : Number(formData.amount),
          termMonths: Number(formData.termMonths),
          interestRate: formData.interestRate ? Number(formData.interestRate) : 0
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess('Loan request created successfully!');
        setTimeout(() => {
          navigate(`/p2p/loans?kametiId=${formData.kametiId}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      setError(error.response?.data?.message || 'Failed to create loan request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Create Loan Request</h1>
          <button
            onClick={() => navigate('/p2p')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back
          </button>
        </div>

        {kameti && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Kameti:</strong> {kameti.name} ({kameti.kametiId})
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Only members of this kameti can fund your loan request.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!kametiIdFromUrl && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Kameti ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="kametiId"
                  value={formData.kametiId}
                  onChange={handleChange}
                  placeholder="Enter Kameti ID (e.g., KAMETI-XXXX)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  You must be a member of this kameti to request a loan.
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Loan Amount (Rs.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="10000"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target Amount (Rs.) <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  placeholder="Same as loan amount"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use loan amount as target
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Term (Months) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="termMonths"
                  value={formData.termMonths}
                  onChange={handleChange}
                  placeholder="12"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interest Rate (%) <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Repayment Schedule
              </label>
              <select
                name="scheduleType"
                value={formData.scheduleType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="amortized">Amortized (Equal monthly payments)</option>
                <option value="bullet">Bullet (Principal at end)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                placeholder="Describe what you need the loan for..."
                rows="4"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
                {success}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Loan Request'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/p2p')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default P2PCreateLoan;
