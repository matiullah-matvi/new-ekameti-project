import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import NavBar from '../components/NavBar';
import { useTranslation } from '../hooks/useTranslation';

const RaiseDispute = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    reason: '',
    explanation: '',
    kametiId: '',
    paymentRecordId: '',
    transactionId: ''
  });
  const [proofFiles, setProofFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [kametis, setKametis] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedKameti, setSelectedKameti] = useState(null); // Store kameti details when passed from state
  const [kametiFromState, setKametiFromState] = useState(false); // Track if kameti came from navigation state

  const REASON_OPTIONS = [
    { value: 'payment_not_recorded', label: 'Payment Not Recorded' },
    { value: 'incorrect_amount', label: 'Incorrect Amount' },
    { value: 'duplicate_payment', label: 'Duplicate Payment' },
    { value: 'refund_request', label: 'Refund Request' },
    { value: 'late_fee_dispute', label: 'Late Fee Dispute' },
    { value: 'interest_dispute', label: 'Interest Rate Dispute' },
    { value: 'payout_issue', label: 'Payout Issue' },
    { value: 'member_issue', label: 'Member Issue' },
    { value: 'other', label: 'Other' }
  ];

  const [kametiMongoId, setKametiMongoId] = useState(null);

  useEffect(() => {
    // Get kametis from location state or fetch from API
    const kametiIdFromState = location.state?.kametiId;
    const mongoIdFromState = location.state?.kametiMongoId;
    
    if (kametiIdFromState) {
      setFormData(prev => ({ ...prev, kametiId: kametiIdFromState }));
      setKametiFromState(true);
    } else {
      setKametiFromState(false);
    }
    
    if (mongoIdFromState) {
      setKametiMongoId(mongoIdFromState);
      // Fetch kameti details using MongoDB _id to display name
      fetchKametiDetails(mongoIdFromState);
      // Fetch payments for this kameti using kametiId
      if (kametiIdFromState) {
        fetchPayments(kametiIdFromState);
      }
    }

    // Fetch user's kametis (only needed if kameti not from state)
    if (!kametiIdFromState) {
      fetchUserKametis();
    }
  }, [location]);

  const fetchKametiDetails = async (mongoId) => {
    try {
      const response = await axios.get(getApiUrl(`kameti/${mongoId}`));
      setSelectedKameti(response.data);
    } catch (error) {
      console.error('Error fetching kameti details:', error);
    }
  };

  const fetchUserKametis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('kameti/my-kametis'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKametis(response.data.kametis || []);
    } catch (error) {
      console.error('Error fetching kametis:', error);
    }
  };

  const fetchPayments = async (kametiId) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await axios.get(getApiUrl(`payments/records/${user._id}?kametiId=${kametiId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayments(response.data.records || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Fetch payments when kameti is selected
    if (name === 'kametiId' && value) {
      fetchPayments(value);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate files
    const validFiles = files.filter(file => {
      const isValidType = /jpeg|jpg|png|pdf|gif/i.test(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({ ...prev, proof: 'Some files are invalid. Only images (JPEG, PNG, GIF) and PDFs up to 5MB are allowed.' }));
      return;
    }

    setProofFiles(prev => [...prev, ...validFiles]);
    if (errors.proof) {
      setErrors(prev => ({ ...prev, proof: '' }));
    }
  };

  const removeFile = (index) => {
    setProofFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.reason) {
      newErrors.reason = 'Please select a reason';
    }

    if (!formData.explanation || formData.explanation.length < 10) {
      newErrors.explanation = 'Please provide a detailed explanation (at least 10 characters)';
    }

    if (formData.explanation && formData.explanation.length > 2000) {
      newErrors.explanation = 'Explanation must be less than 2000 characters';
    }

    if (!formData.kametiId) {
      newErrors.kametiId = 'Please select a Kameti';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RaiseDispute.jsx:164',message:'handleSubmit entry',data:{hasKametiId:!!formData.kametiId,kametiId:formData.kametiId,hasReason:!!formData.reason,hasExplanation:!!formData.explanation,explanationLength:formData.explanation?.length,proofFilesCount:proofFiles.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const token = localStorage.getItem('token');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RaiseDispute.jsx:175',message:'Before creating FormData',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const formDataToSend = new FormData();

      formDataToSend.append('reason', formData.reason);
      formDataToSend.append('explanation', formData.explanation);
      formDataToSend.append('kametiId', formData.kametiId);
      if (formData.paymentRecordId) {
        formDataToSend.append('paymentRecordId', formData.paymentRecordId);
      }
      if (formData.transactionId) {
        formDataToSend.append('transactionId', formData.transactionId);
      }

      // Append proof files
      proofFiles.forEach((file, index) => {
        formDataToSend.append('proof', file);
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RaiseDispute.jsx:193',message:'Before API call',data:{kametiId:formData.kametiId,reason:formData.reason,apiUrl:getApiUrl('disputes/raise')},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const response = await axios.post(getApiUrl('disputes/raise'), formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RaiseDispute.jsx:200',message:'API success',data:{caseId:response.data.dispute?.caseId},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setMessage('✅ Dispute raised successfully! Case ID: ' + response.data.dispute.caseId);
      
      // Reset form after 2 seconds but stay on the same page
      setTimeout(() => {
        setFormData({
          reason: '',
          explanation: '',
          kametiId: formData.kametiId, // Keep kametiId if it was set
          paymentRecordId: '',
          transactionId: ''
        });
        setProofFiles([]);
        setErrors({});
        setMessage(''); // Clear success message
      }, 3000);

    } catch (error) {
      console.error('Error raising dispute:', error);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RaiseDispute.jsx:217',message:'handleSubmit error',data:{errorMessage:error.message,errorResponse:error.response?.data,errorStatus:error.response?.status,errorStatusText:error.response?.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      setMessage(error.response?.data?.message || 'Failed to raise dispute. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Raise a Dispute</h1>
            <p className="text-gray-600">Submit a dispute for review. Our team will investigate and respond promptly.</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kameti Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kameti <span className="text-red-500">*</span>
              </label>
              {kametiFromState && selectedKameti ? (
                // Show read-only kameti name when passed from navigation state
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedKameti.name}</p>
                      <p className="text-sm text-gray-500">ID: {selectedKameti.kametiId}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              ) : (
                // Show dropdown only if kameti not from state
                <select
                  name="kametiId"
                  value={formData.kametiId}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.kametiId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Select a Kameti</option>
                  {kametis.map(kameti => (
                    <option key={kameti.kametiId} value={kameti.kametiId}>
                      {kameti.name} ({kameti.kametiId})
                    </option>
                  ))}
                </select>
              )}
              {errors.kametiId && <p className="mt-1 text-sm text-red-600">{errors.kametiId}</p>}
            </div>

            {/* Payment Selection (Optional) */}
            {formData.kametiId && payments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Payment (Optional)
                </label>
                <select
                  name="paymentRecordId"
                  value={formData.paymentRecordId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a payment (if applicable)</option>
                  {payments.map(payment => (
                    <option key={payment._id} value={payment._id}>
                      Round {payment.round} - Rs. {payment.amount} - {payment.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Transaction ID (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                name="transactionId"
                value={formData.transactionId}
                onChange={handleChange}
                placeholder="Enter transaction ID if known"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.reason ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a reason</option>
                {REASON_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                name="explanation"
                value={formData.explanation}
                onChange={handleChange}
                rows={6}
                placeholder="Please provide a detailed explanation of your dispute..."
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.explanation ? 'border-red-500' : 'border-gray-300'
                }`}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                {formData.explanation.length}/2000 characters
              </p>
              {errors.explanation && <p className="mt-1 text-sm text-red-600">{errors.explanation}</p>}
            </div>

            {/* Proof Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof/Evidence (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="proofFiles"
                />
                <label htmlFor="proofFiles" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload proof (screenshots, receipts, etc.)
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB each (max 5 files)</p>
                </label>
              </div>
              {errors.proof && <p className="mt-1 text-sm text-red-600">{errors.proof}</p>}

              {/* Display uploaded files */}
              {proofFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {proofFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RaiseDispute;

