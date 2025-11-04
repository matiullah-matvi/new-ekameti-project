import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    cnic: '',
    cnicImage: null,
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);

    // Pre-fill existing data
    if (storedUser.phone) setFormData(prev => ({ ...prev, phone: storedUser.phone }));
    if (storedUser.cnic) setFormData(prev => ({ ...prev, cnic: storedUser.cnic }));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Format phone number
    let processedValue = value;
    if (name === 'phone') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 11);
    }
    
    // Format CNIC
    if (name === 'cnic') {
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 13);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        cnicImage: file
      }));
      if (errors.cnicImage) {
        setErrors(prev => ({ ...prev, cnicImage: '' }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^03[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must start with 03 and be 11 digits';
    }

    // CNIC validation
    if (!formData.cnic) {
      newErrors.cnic = 'CNIC is required';
    } else if (!/^[0-9]{13}$/.test(formData.cnic)) {
      newErrors.cnic = 'CNIC must be exactly 13 digits';
    }

    // CNIC Image validation (REQUIRED)
    if (!formData.cnicImage) {
      newErrors.cnicImage = 'CNIC photo is required for verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const updateData = new FormData();
      updateData.append('phone', formData.phone);
      updateData.append('cnic', formData.cnic);
      if (formData.cnicImage) {
        updateData.append('cnicImage', formData.cnicImage);
      }

      const response = await axios.put(
        getApiUrl('users/complete-profile'),
        updateData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('✅ Profile completed:', response.data);

      // Update user in localStorage
      const updatedUser = {
        ...user,
        phone: formData.phone,
        cnic: formData.cnic,
        profileComplete: true
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('ekametiUser', JSON.stringify(updatedUser));

      setMessage('✅ Profile completed successfully! Redirecting...');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('❌ Profile completion error:', error);
      setMessage(error.response?.data?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">
            Welcome, <span className="font-semibold text-blue-600">{user?.fullName}</span>! 
            <br />Please provide some additional information to continue.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">+92</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="3001234567"
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  maxLength={11}
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Format: 03001234567</p>
            </div>

            {/* CNIC Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNIC Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                placeholder="1234512345671"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.cnic ? 'border-red-500' : 'border-gray-300'
                }`}
                maxLength={13}
              />
              {errors.cnic && (
                <p className="mt-1 text-sm text-red-600">{errors.cnic}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">13 digits without dashes</p>
            </div>

            {/* CNIC Image (REQUIRED) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNIC Photo <span className="text-red-500">*</span>
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors ${
                errors.cnicImage ? 'border-red-500' : 'border-gray-300'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="cnicImage"
                  required
                />
                <label htmlFor="cnicImage" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {formData.cnicImage ? formData.cnicImage.name : 'Click to upload CNIC photo'}
                  </p>
                  <p className="text-xs text-gray-500">Clear photo of front side • PNG, JPG up to 10MB</p>
                </label>
              </div>
              {errors.cnicImage && (
                <p className="mt-1 text-sm text-red-600">{errors.cnicImage}</p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                📸 <strong>Important:</strong> Take a clear photo of your CNIC front side. We'll verify your name and CNIC number automatically.
              </p>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Completing Profile...
                </>
              ) : (
                'Complete Profile & Continue'
              )}
            </button>
          </form>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              This information is required to create or join Kametis. Your data is encrypted and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;

