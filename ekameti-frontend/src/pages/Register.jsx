import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    cnic: '',
    cnicImage: null,
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [extractedCNICData, setExtractedCNICData] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  // OTP Verification States
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for CNIC formatting
    let processedValue = value;
    if (name === 'cnic') {
      // Remove any non-digit characters and limit to 13 digits
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 13);
    }
    
    // Special handling for phone formatting
    if (name === 'phone') {
      // Remove any non-digit characters and limit to 11 digits
      processedValue = value.replace(/[^0-9]/g, '').slice(0, 11);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Real-time validation for CNIC
    if (name === 'cnic' && processedValue.length === 13) {
      const cnicValidation = validateCNICFormat(processedValue);
      if (!cnicValidation.valid) {
        setErrors(prev => ({ ...prev, cnic: cnicValidation.error }));
      }
    }
    
    // Real-time validation for phone
    if (name === 'phone' && processedValue.length === 11) {
      const phoneValidation = validatePhoneNumber(processedValue);
      if (!phoneValidation.valid) {
        setErrors(prev => ({ ...prev, phone: phoneValidation.error }));
      }
    }
  };

  // OCR Function to extract text from CNIC image via backend (free, self-hosted)
  const extractTextFromImage = async (file) => {
    const fd = new FormData();
    fd.append('image', file);

    const res = await axios.post('http://localhost:5000/api/ocr/cnic', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });

    return {
      extractedName: res.data?.extractedName || '',
      extractedCNIC: res.data?.extractedCNIC || '',
      confidence: typeof res.data?.confidence === 'number' ? res.data.confidence : 0,
      rawText: res.data?.rawText || '',
    };
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, cnicImage: 'Please upload a valid image file' }));
      return;
    }
    
    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, cnicImage: 'File size must be less than 10MB' }));
      return;
    }
    
    setIsProcessingImage(true);
    setFormData((prev) => ({
      ...prev,
      cnicImage: file,
    }));
    
    if (errors.cnicImage) {
      setErrors(prev => ({ ...prev, cnicImage: '' }));
    }
    
    try {
      // Extract text from CNIC image
      const extractedData = await extractTextFromImage(file);
      setExtractedCNICData(extractedData);
      
      // Auto-fill CNIC if extracted
      if (extractedData.extractedCNIC) {
        setFormData(prev => ({
          ...prev,
          cnic: extractedData.extractedCNIC
        }));
      }
      
      console.log('✅ CNIC data extracted:', extractedData);
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      setErrors(prev => ({ 
        ...prev, 
        cnicImage: 'Failed to process CNIC image. Please try again.' 
      }));
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Identity verification functions
  const validateCNICFormat = (cnic) => {
    // Remove any dashes or spaces
    const cleanCNIC = cnic.replace(/[-\s]/g, '');
    
    // hidden debug: CNIC validation
    
    // Check if it's exactly 13 digits
    if (!/^[0-9]{13}$/.test(cleanCNIC)) {
      return { valid: false, error: 'CNIC must be exactly 13 digits' };
    }
    
    // Basic format validation (simplified checksum)
    // Check if it starts with valid region codes (1-9)
    const regionCode = parseInt(cleanCNIC.substring(0, 1));
    if (regionCode < 1 || regionCode > 9) {
      return { valid: false, error: 'Invalid CNIC region code' };
    }
    
    // Check if it's not all same digits
    if (/^(\d)\1{12}$/.test(cleanCNIC)) {
      return { valid: false, error: 'Invalid CNIC number' };
    }
    
    // Additional basic checks
    // Check if it's not a sequence like 1234567890123
    if (/1234567890123|9876543210987/.test(cleanCNIC)) {
      return { valid: false, error: 'Invalid CNIC number' };
    }
    
    // Your CNIC should pass all these checks
    return { valid: true, cleanCNIC };
  };

  const validateNameCNICConsistency = (name, cnic) => {
    // hidden debug: name-cnic consistency
    
    // Extract name parts
    const nameParts = name.toLowerCase().trim().split(/\s+/);
    
    // Basic validation - name should have at least 2 parts (first name + last name)
    if (nameParts.length < 2) {
      return { valid: false, error: 'Please enter your full name (first name and last name)' };
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /^[0-9]+$/, // All numbers
      /^[a-z]+[0-9]+$/, // Name followed by numbers
      /test|demo|sample|fake/i, // Test names
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(name)) {
        return { valid: false, error: 'Please enter a valid name' };
      }
    }
    
    // If we have extracted CNIC data, validate against it
    if (extractedCNICData) {
      
      // Check if CNIC numbers match
      const cleanEnteredCNIC = cnic.replace(/[-\s]/g, '');
      const cleanExtractedCNIC = extractedCNICData.extractedCNIC.replace(/[-\s]/g, '');
      
      if (cleanEnteredCNIC !== cleanExtractedCNIC) {
        return { valid: false, error: 'We couldn\'t verify your ID. Please recheck your details or upload a clearer photo.' };
      }
      
      // Check if names match (simplified comparison)
      const enteredNameWords = name.toLowerCase().split(/\s+/);
      const extractedNameWords = extractedCNICData.extractedName.toLowerCase().split(/\s+/);
      
      // Check if at least 2 words match
      let matchingWords = 0;
      for (const enteredWord of enteredNameWords) {
        for (const extractedWord of extractedNameWords) {
          if (enteredWord === extractedWord || 
              enteredWord.includes(extractedWord) || 
              extractedWord.includes(enteredWord)) {
            matchingWords++;
            break;
          }
        }
      }
      
      if (matchingWords < 2) {
        return { valid: false, error: 'We couldn\'t verify your ID. Please make sure your name is entered correctly.' };
      }
    }
    return { valid: true };
  };

  const validatePhoneNumber = (phone) => {
    // Remove any spaces or dashes
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Check if it starts with 03 and is 11 digits
    if (!/^03[0-9]{9}$/.test(cleanPhone)) {
      return { valid: false, error: 'Phone number must start with 03 and be 11 digits (e.g., 0300-1234567)' };
    }
    
    return { valid: true, cleanPhone };
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      
      // Name validation
      const nameValidation = validateNameCNICConsistency(formData.fullName, formData.cnic);
      if (!nameValidation.valid) {
        newErrors.fullName = nameValidation.error;
      } else if (!/^[a-zA-Z\s]{3,}$/.test(formData.fullName)) {
        newErrors.fullName = 'Enter valid full name (min 3 characters)';
      }
      
      // Username validation
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Username can only contain letters, numbers, and underscores';
      }
      
      // Email validation
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Enter a valid email address';
      }
      
      // Phone validation
      const phoneValidation = validatePhoneNumber(formData.phone);
      if (!phoneValidation.valid) {
        newErrors.phone = phoneValidation.error;
      }
    }
    
    if (step === 2) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    
    if (step === 3) {
      
      // CNIC validation
      const cnicValidation = validateCNICFormat(formData.cnic);
      if (!cnicValidation.valid) {
        newErrors.cnic = cnicValidation.error;
      }
      
      // Cross-validate name and CNIC
      if (cnicValidation.valid && formData.fullName) {
        const nameValidation = validateNameCNICConsistency(formData.fullName, formData.cnic);
        if (!nameValidation.valid) {
          newErrors.cnic = 'Identity verification failed: ' + nameValidation.error;
        }
      }
      
      // File validation
      if (!formData.cnicImage) {
        newErrors.cnicImage = 'Please upload CNIC image';
      } else if (formData.cnicImage.size > 10 * 1024 * 1024) { // 10MB limit
        newErrors.cnicImage = 'File size must be less than 10MB';
      } else if (!formData.cnicImage.type.startsWith('image/')) {
        newErrors.cnicImage = 'Please upload a valid image file';
      }
      
      if (!formData.agreeTerms) {
        newErrors.agreeTerms = 'You must agree to terms and conditions';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsLoading(true);
    setMessage('');

    try {
      // Send OTP request to new endpoint
      const response = await axios.post('http://localhost:5000/api/users/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        cnic: formData.cnic,
        phone: formData.phone
      });

      console.log('✅ OTP Response:', response.data);

      // Store form data in localStorage for OTP verification
      localStorage.setItem('registrationData', JSON.stringify(formData));

      setMessage('✅ OTP sent to your email! Check your inbox.');

      // Show OTP modal instead of navigating
      setTimeout(() => {
        setShowOTPModal(true);
      }, 1000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed. Please try again.');
      console.log("❌ Registration error:", err.response?.data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setOtpError('');

    try {
      // Get registration data from localStorage
      const registrationData = JSON.parse(localStorage.getItem('registrationData') || '{}');
      
      // Verify OTP and create user account
      const response = await axios.post('http://localhost:5000/api/users/verify-otp', {
        fullName: registrationData.fullName,
        email: registrationData.email,
        password: registrationData.password,
        cnic: registrationData.cnic,
        phone: registrationData.phone,
        otp: otp
      });

      console.log('✅ Verification Success:', response.data);

      // Clear registration data
      localStorage.removeItem('registrationData');

      // Close OTP modal
      setShowOTPModal(false);

      // Show success message
      setMessage('✅ Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/register-success');
      }, 1500);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'OTP verification failed. Please try again.');
      console.error('❌ Verification Error:', err.response?.data);
    } finally {
      setIsVerifying(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info', description: 'Basic information' },
    { number: 2, title: 'Security', description: 'Password setup' },
    { number: 3, title: 'Verification', description: 'Identity verification' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                eKameti
              </div>
            </Link>
            <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.number ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    currentStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
            <h1 className="text-2xl font-bold">Create Your Account</h1>
            <p className="text-blue-100">Join thousands of users saving together</p>
          </div>

          {/* Google Sign Up */}
          <div className="p-6 border-b border-gray-200">
            <button
              type="button"
              onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or register with email</span>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} encType="multipart/form-data" className="p-6">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mb-6">
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${errors.fullName ? 'border-red-500' : ''}`}
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${errors.username ? 'border-red-500' : ''}`}
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    {errors.username && (
                      <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${errors.email ? 'border-red-500' : ''}`}
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${errors.phone ? 'border-red-500' : ''} ${formData.phone.length === 11 && !errors.phone ? 'border-green-500' : ''}`}
                        placeholder="03001234567"
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength="11"
                      />
                      {formData.phone.length === 11 && !errors.phone && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {errors.phone && (
                      <div className="mt-1 flex items-center">
                        <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-600">{errors.phone}</p>
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      <p>• Must start with 03 (Pakistani mobile number)</p>
                      <p>• Format: 03001234567</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Security */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white pr-12 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="text-gray-400 hover:text-gray-600">
                        {showPassword ? '🙈' : '👁️'}
                      </span>
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Password must be at least 6 characters long
                  </p>
                </div>

                <div className="mb-6">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white pr-12 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <span className="text-gray-400 hover:text-gray-600">
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </span>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verification */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Identity Verification Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Identity Verification Required
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>For security purposes, we verify that your information matches your CNIC:</p>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          <li>Your name must match the name on your CNIC card</li>
                          <li>CNIC number must be valid and properly formatted</li>
                          <li>Upload a clear photo of your CNIC front side</li>
                          <li>All information will be encrypted and securely stored</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <label htmlFor="cnic" className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Number *
                  </label>
                  <div className="relative">
                    <input
                      id="cnic"
                      name="cnic"
                      type="text"
                      required
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${errors.cnic ? 'border-red-500' : ''} ${formData.cnic.length === 13 && !errors.cnic ? 'border-green-500' : ''}`}
                      placeholder="1234512345671"
                      value={formData.cnic}
                      onChange={handleChange}
                      maxLength="13"
                    />
                    {formData.cnic.length === 13 && !errors.cnic && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {errors.cnic && (
                    <div className="mt-1 flex items-center">
                      <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-600">{errors.cnic}</p>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    <p>• Enter your 13-digit CNIC number (numbers only)</p>
                    <p>• Format: 1234512345671 (no dashes or spaces)</p>
                    <p>• Must match the name on your CNIC card</p>
                    <p>• Must start with digits 1-9 (valid region codes)</p>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="form-label">
                    CNIC Image *
                  </label>
                  <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                    isProcessingImage 
                      ? 'border-blue-400 bg-blue-50' 
                      : extractedCNICData 
                        ? 'border-green-400 bg-green-50' 
                        : 'border-gray-300 hover:border-blue-400'
                  }`}>
                    <div className="space-y-1 text-center">
                      {isProcessingImage ? (
                        <>
                          <div className="loading-spinner mx-auto mb-2"></div>
                          <p className="text-sm text-blue-600">Processing CNIC image...</p>
                          <p className="text-xs text-gray-500">Extracting text and validating information</p>
                        </>
                      ) : extractedCNICData ? (
                        <>
                          <svg className="mx-auto h-12 w-12 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-green-600 font-medium">CNIC Data Extracted Successfully!</p>
                          <div className="text-xs text-gray-600 space-y-1">
                            <p><strong>Name:</strong> {extractedCNICData.extractedName}</p>
                            <p><strong>CNIC:</strong> {extractedCNICData.extractedCNIC}</p>
                            <p><strong>Confidence:</strong> {(extractedCNICData.confidence * 100).toFixed(1)}%</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label htmlFor="cnicImage" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                              <span>Upload CNIC image</span>
                              <input
                                id="cnicImage"
                                name="cnicImage"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleFileChange}
                              />
            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {formData.cnicImage && !isProcessingImage && (
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm text-green-600">
                        ✓ {formData.cnicImage.name} selected
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, cnicImage: null }));
                          setExtractedCNICData(null);
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  
                  {errors.cnicImage && (
                    <div className="mt-1 flex items-center">
                      <svg className="w-4 h-4 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-600">{errors.cnicImage}</p>
                    </div>
                  )}
                  
                  {/* Extracted info hidden from users to avoid disclosure */}
                </div>

                <div className="mb-6">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="agreeTerms"
                        name="agreeTerms"
                        type="checkbox"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="agreeTerms" className="text-gray-700">
                        I agree to the{' '}
                        <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                          Terms and Conditions
                        </a>{' '}
                        and{' '}
                        <a href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                  </div>
                  {errors.agreeTerms && (
                    <p className="mt-1 text-sm text-red-600">{errors.agreeTerms}</p>
                  )}
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="btn-secondary"
                  >
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="loading-spinner mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </div>
            )}
        </form>

          {/* Messages */}
          {message && (
            <div className={`mx-6 mb-6 p-4 rounded-lg ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.includes('✅') ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    message.includes('✅') ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Platform</h3>
            <p className="text-gray-600 text-sm">Your data is protected with bank-level security</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Payments</h3>
            <p className="text-gray-600 text-sm">Instant digital payments with PayFast integration</p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted Community</h3>
            <p className="text-gray-600 text-sm">Join thousands of verified users saving together</p>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
              <p className="text-gray-600 text-sm">
                We've sent a 6-digit verification code to<br />
                <span className="font-semibold text-blue-600">{formData.email}</span>
              </p>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
            </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-bold tracking-widest"
                  maxLength={6}
                  required
                  autoFocus
                />
                {otpError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {otpError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOTPModal(false);
                    setOtp('');
                    setOtpError('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isVerifying}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || otp.length !== 6}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isVerifying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </button>
              </div>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={isVerifying}
                  >
                    Resend OTP
                  </button>
                </p>
              </div>
        </form>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-800 flex items-start">
                <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Check your email inbox and spam folder. The code expires in 10 minutes.
              </p>
            </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default Register;
