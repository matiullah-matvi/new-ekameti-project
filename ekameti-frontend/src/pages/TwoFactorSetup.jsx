import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TwoFactorSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Backup Codes
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Initialize 2FA setup
  const initiate2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/2fa/setup',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setQrCode(response.data.qrCode);
      setSecret(response.data.manualEntryKey);
      setBackupCodes(response.data.backupCodes);
      setStep(2);
      console.log('✅ 2FA setup initiated');
    } catch (err) {
      console.error('❌ 2FA setup error:', err);
      setError(err.response?.data?.message || 'Failed to initiate 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  // Verify and enable 2FA
  const verify2FA = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/2fa/verify-enable',
        { token: verificationCode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessage(response.data.message);
      setStep(3);
      console.log('✅ 2FA enabled successfully');
    } catch (err) {
      console.error('❌ 2FA verification error:', err);
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    const content = `eKameti Two-Factor Authentication Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ekameti-backup-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Copy backup codes to clipboard
  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setMessage('Backup codes copied to clipboard!');
    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    if (step === 1) {
      initiate2FA();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enable Two-Factor Authentication</h1>
          <p className="text-gray-600">Add an extra layer of security to your account</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
              3
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Step 2: Scan QR Code and Verify */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Scan QR Code</h2>
                <p className="text-gray-600 mb-6">
                  Use an authenticator app like <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> to scan this QR code.
                </p>

                {/* QR Code */}
                {qrCode && (
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                    </div>
                  </div>
                )}

                {/* Manual Entry */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 mb-2"><strong>Can't scan the QR code?</strong></p>
                  <p className="text-xs text-blue-700 mb-2">Enter this code manually:</p>
                  <div className="flex items-center justify-between bg-white px-4 py-2 rounded border border-blue-300">
                    <code className="text-sm font-mono text-gray-900">{secret}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(secret);
                        setMessage('Secret copied!');
                        setTimeout(() => setMessage(''), 2000);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Verification Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-bold tracking-widest"
                    maxLength={6}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {message && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{message}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={verify2FA}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">2FA Enabled Successfully!</h2>
                <p className="text-gray-600">Save your backup codes in a safe place</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">Important!</h3>
                    <p className="text-sm text-yellow-700">
                      Save these backup codes now. You'll need them if you lose access to your authenticator app. Each code can only be used once.
                    </p>
                  </div>
                </div>
              </div>

              {/* Backup Codes Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Your Backup Codes</h3>
                <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-white px-4 py-2 rounded border border-gray-300 text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={downloadBackupCodes}
                  className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={copyBackupCodes}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
              >
                Done - Go to Profile
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600 text-center">
            <strong>Need help?</strong> Contact us at{' '}
            <a href="mailto:ekameti.service@gmail.com" className="text-blue-600 hover:text-blue-700">
              ekameti.service@gmail.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;

