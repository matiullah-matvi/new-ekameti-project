// Create Kameti page - modern multi-step form
// Styling in CreateKameti.css

import React, { useState } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { useNavigate } from 'react-router-dom';
import '../styles/CreateKameti.css';

const CreateKameti = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdKameti, setCreatedKameti] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    contributionFrequency: 'monthly',
    startDate: '',
    members: '',
    rounds: '',
    payoutOrder: 'random',
    isPrivate: false,
    autoReminders: true,
    latePaymentFee: '',
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  
  // get user from localStorage
  const user = JSON.parse(localStorage.getItem('ekametiUser'));
  const userId = user?._id;
  const username = user?.username;

  // handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // validate current step
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Kameti name is required';
      if (formData.name.length < 3) newErrors.name = 'Name must be at least 3 characters';
      if (!formData.description.trim()) newErrors.description = 'Description is required';
      if (!formData.amount || formData.amount < 1000) newErrors.amount = 'Minimum amount is Rs. 1,000';
    }
    
    if (step === 2) {
      if (!formData.members || formData.members < 2) newErrors.members = 'Minimum 2 members required';
      if (formData.members > 50) newErrors.members = 'Maximum 50 members allowed';
      if (!formData.rounds || formData.rounds < 1) newErrors.rounds = 'At least 1 round required';
      // removed validation: rounds can be different from members (each member gets payout once per round)
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      
      // validate start date is not in the past
      const selectedDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) newErrors.startDate = 'Start date cannot be in the past';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // move to next step
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // move to previous step
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId || !username) {
      setMessage({ type: 'error', text: 'Please login to create a Kameti' });
      return;
    }

    if (!validateStep(3)) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    const kametiData = {
      name: formData.name,
      description: formData.description,
      amount: Number(formData.amount),
      contributionFrequency: formData.contributionFrequency,
      startDate: formData.startDate,
      membersCount: Number(formData.members),
      round: `1 of ${formData.rounds}`,
      totalRounds: Number(formData.rounds),
      payoutOrder: formData.payoutOrder,
      isPrivate: formData.isPrivate,
      autoReminders: formData.autoReminders,
      latePaymentFee: formData.latePaymentFee ? Number(formData.latePaymentFee) : 0,
      status: 'Pending',
      createdBy: userId,
      createdByName: username,
      members: [] // will be populated when users join
    };

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/kameti/create', kametiData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Created Kameti:', res.data);

      // show success modal instead of redirecting
      setCreatedKameti(res.data.kameti);
      setShowSuccessModal(true);
      setLoading(false);
    } catch (err) {
      console.error('Error:', err.response?.data || err.message);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to create Kameti. Please try again.' 
      });
      setLoading(false);
    }
  };

  // calculate total pool
  const totalPool = formData.amount && formData.members 
    ? (Number(formData.amount) * Number(formData.members)).toLocaleString() 
    : '0';

  // copy kameti link to clipboard
  const copyKametiLink = () => {
    if (createdKameti) {
      const link = `${window.location.origin}/join-kameti/${createdKameti._id}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
      });
    }
  };

  // share via whatsapp - creates clickable link
  const shareViaWhatsApp = () => {
    if (createdKameti) {
      const link = `${window.location.origin}/join-kameti/${createdKameti._id}`;
      // format message with proper line breaks and clickable link
      const message = `🎯 *Join my Kameti: ${createdKameti.name}*\n\n💰 Contribution: Rs. ${createdKameti.amount.toLocaleString()}\n👥 Members: ${createdKameti.membersCount}\n📅 Frequency: ${createdKameti.contributionFrequency}\n\n👉 Click to join: ${link}`;
      
      // open whatsapp with encoded message
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  // share via email
  const shareViaEmail = () => {
    if (createdKameti) {
      const link = `${window.location.origin}/join-kameti/${createdKameti._id}`;
      const subject = `Join my Kameti: ${createdKameti.name}`;
      const body = `Hi,\n\nI've created a Kameti group and would love for you to join!\n\nKameti Name: ${createdKameti.name}\nContribution Amount: Rs. ${createdKameti.amount.toLocaleString()}\nFrequency: ${createdKameti.contributionFrequency}\nTotal Members: ${createdKameti.membersCount}\n\nClick here to join: ${link}\n\nLooking forward to saving together!`;
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  return (
    <div className="create-kameti-container">
      <NavBar />

      {/* hero section */}
      <div className="create-hero">
        <div className="create-hero-content">
          <h1 className="create-hero-title">Create Your Kameti</h1>
          <p className="create-hero-subtitle">Set up a new savings group in just 3 simple steps</p>
        </div>
      </div>

      <div className="create-main">
        {/* progress indicator */}
        <div className="progress-container">
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
              <div className="progress-step-circle">
                {currentStep > 1 ? (
                  <svg className="progress-check" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>1</span>
                )}
              </div>
              <span className="progress-step-label">Basic Info</span>
            </div>

            <div className="progress-line"></div>

            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="progress-step-circle">
                {currentStep > 2 ? (
                  <svg className="progress-check" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>2</span>
                )}
              </div>
              <span className="progress-step-label">Members & Schedule</span>
            </div>

            <div className="progress-line"></div>

            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="progress-step-circle">
                <span>3</span>
              </div>
              <span className="progress-step-label">Settings & Review</span>
            </div>
          </div>
        </div>

        {/* form container */}
        <div className="form-container">
        <form onSubmit={handleSubmit}>
            
            {/* step 1: basic info */}
            {currentStep === 1 && (
              <div className="form-step">
                <h2 className="form-step-title">Basic Information</h2>
                <p className="form-step-description">Tell us about your kameti and contribution amount</p>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">
                      Kameti Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Family Savings Group"
                      className={`form-input ${errors.name ? 'error' : ''}`}
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">
                      Description <span className="required">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of the kameti purpose and goals"
                      className={`form-textarea ${errors.description ? 'error' : ''}`}
                      rows="3"
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Contribution Amount (Rs.) <span className="required">*</span>
                    </label>
                    <div className="input-with-icon">
                      <span className="input-icon">Rs.</span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        placeholder="5000"
                        className={`form-input with-icon ${errors.amount ? 'error' : ''}`}
                        min="1000"
                      />
                    </div>
                    {errors.amount && <span className="error-text">{errors.amount}</span>}
                    <span className="help-text">Minimum amount: Rs. 1,000</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Contribution Frequency <span className="required">*</span>
                    </label>
                    <select
                      name="contributionFrequency"
                      value={formData.contributionFrequency}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="button" onClick={nextStep} className="btn-primary">
                    Next Step
                    <svg className="btn-icon-right" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* step 2: members & schedule */}
            {currentStep === 2 && (
              <div className="form-step">
                <h2 className="form-step-title">Members & Schedule</h2>
                <p className="form-step-description">Define group size and timeline</p>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      Number of Members <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="members"
                      value={formData.members}
                      onChange={handleChange}
                      placeholder="10"
                      className={`form-input ${errors.members ? 'error' : ''}`}
                      min="2"
                      max="50"
                    />
                    {errors.members && <span className="error-text">{errors.members}</span>}
                    <span className="help-text">Between 2 and 50 members</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Total Rounds <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      name="rounds"
                      value={formData.rounds}
                      onChange={handleChange}
                      placeholder="10"
                      className={`form-input ${errors.rounds ? 'error' : ''}`}
                      min="1"
                    />
                    {errors.rounds && <span className="error-text">{errors.rounds}</span>}
                    <span className="help-text">Each round = one member gets payout. Can be more or less than member count.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Start Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`form-input ${errors.startDate ? 'error' : ''}`}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    {errors.startDate && <span className="error-text">{errors.startDate}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Payout Order
                    </label>
                    <select
                      name="payoutOrder"
                      value={formData.payoutOrder}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="random">Random Draw</option>
                      <option value="sequential">Sequential (First Come First Serve)</option>
                      <option value="bidding">Bidding System</option>
                      <option value="admin">Admin Decides</option>
                    </select>
                  </div>
                </div>

                {/* summary card */}
                <div className="summary-card">
                  <h3 className="summary-title">Kameti Summary</h3>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">Total Pool</span>
                      <span className="summary-value">Rs. {totalPool}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Per Member</span>
                      <span className="summary-value">Rs. {formData.amount ? Number(formData.amount).toLocaleString() : '0'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Duration</span>
                      <span className="summary-value">
                        {formData.rounds} {formData.contributionFrequency === 'monthly' ? 'months' : 'periods'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={prevStep} className="btn-secondary">
                    <svg className="btn-icon-left" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button type="button" onClick={nextStep} className="btn-primary">
                    Next Step
                    <svg className="btn-icon-right" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* step 3: settings & review */}
            {currentStep === 3 && (
              <div className="form-step">
                <h2 className="form-step-title">Settings & Review</h2>
                <p className="form-step-description">Configure additional settings and review your kameti</p>

                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">
                      Late Payment Fee (Optional)
                    </label>
                    <div className="input-with-icon">
                      <span className="input-icon">Rs.</span>
                      <input
                        type="number"
                        name="latePaymentFee"
                        value={formData.latePaymentFee}
                        onChange={handleChange}
                        placeholder="0"
                        className="form-input with-icon"
                        min="0"
                      />
                    </div>
                    <span className="help-text">Penalty for late contributions (optional)</span>
                  </div>

                  <div className="form-group full-width">
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="isPrivate"
                          checked={formData.isPrivate}
                          onChange={handleChange}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">
                          <strong>Private Kameti</strong>
                          <span className="checkbox-description">Only invited members can join</span>
                        </span>
                      </label>

                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="autoReminders"
                          checked={formData.autoReminders}
                          onChange={handleChange}
                          className="checkbox-input"
                        />
                        <span className="checkbox-text">
                          <strong>Automatic Reminders</strong>
                          <span className="checkbox-description">Send payment reminders to members</span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* final review card */}
                <div className="review-card">
                  <h3 className="review-title">Review Your Kameti</h3>
                  <div className="review-grid">
                    <div className="review-row">
                      <span className="review-label">Name:</span>
                      <span className="review-value">{formData.name}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Description:</span>
                      <span className="review-value">{formData.description}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Contribution:</span>
                      <span className="review-value">Rs. {formData.amount ? Number(formData.amount).toLocaleString() : '0'} / {formData.contributionFrequency}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Members:</span>
                      <span className="review-value">{formData.members} people</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Total Pool:</span>
                      <span className="review-value highlight">Rs. {totalPool}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Start Date:</span>
                      <span className="review-value">{formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Payout Order:</span>
                      <span className="review-value">{formData.payoutOrder}</span>
                    </div>
                    <div className="review-row">
                      <span className="review-label">Privacy:</span>
                      <span className="review-value">{formData.isPrivate ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                </div>

                {/* message display */}
                {message.text && (
                  <div className={`message-box ${message.type}`}>
                    {message.type === 'success' ? (
                      <svg className="message-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="message-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" onClick={prevStep} className="btn-secondary" disabled={loading}>
                    <svg className="btn-icon-left" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Kameti
                        <svg className="btn-icon-right" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
        </form>
        </div>
      </div>

      {/* success modal */}
      {showSuccessModal && createdKameti && (
        <div className="modal-overlay">
          <div className="modal-container">
            {/* success icon */}
            <div className="modal-success-icon">
              <svg className="success-checkmark" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>

            {/* modal header */}
            <h2 className="modal-title">Kameti Created Successfully!</h2>
            <p className="modal-subtitle">Your kameti "{createdKameti.name}" is ready. Now invite members to join!</p>

            {/* kameti summary */}
            <div className="modal-summary">
              <div className="modal-summary-item">
                <span className="modal-summary-label">Contribution</span>
                <span className="modal-summary-value">Rs. {createdKameti.amount.toLocaleString()}</span>
              </div>
              <div className="modal-summary-item">
                <span className="modal-summary-label">Members</span>
                <span className="modal-summary-value">{createdKameti.membersCount} people</span>
              </div>
              <div className="modal-summary-item">
                <span className="modal-summary-label">Total Pool</span>
                <span className="modal-summary-value">Rs. {(createdKameti.amount * createdKameti.membersCount).toLocaleString()}</span>
              </div>
            </div>

            {/* share options */}
            <div className="modal-actions">
              <h3 className="modal-section-title">Share & Invite</h3>
              
              {/* copy link button */}
              <button onClick={copyKametiLink} className="modal-action-btn primary">
                <div className="modal-action-content">
                  <div className="modal-action-icon icon-bg-blue">
                    {copiedLink ? (
                      <svg className="icon-svg-sm icon-text-blue" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="icon-svg-sm icon-text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="modal-action-text">
                    <span className="modal-action-title">{copiedLink ? 'Link Copied!' : 'Copy Invitation Link'}</span>
                    <span className="modal-action-desc">Share the link with anyone</span>
                  </div>
                </div>
                <svg className="modal-action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* whatsapp button */}
              <button onClick={shareViaWhatsApp} className="modal-action-btn">
                <div className="modal-action-content">
                  <div className="modal-action-icon icon-bg-green">
                    <svg className="icon-svg-sm icon-text-green" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="modal-action-text">
                    <span className="modal-action-title">Share via WhatsApp</span>
                    <span className="modal-action-desc">Send invitation to contacts</span>
                  </div>
                </div>
                <svg className="modal-action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* email button */}
              <button onClick={shareViaEmail} className="modal-action-btn">
                <div className="modal-action-content">
                  <div className="modal-action-icon icon-bg-purple">
                    <svg className="icon-svg-sm icon-text-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="modal-action-text">
                    <span className="modal-action-title">Share via Email</span>
                    <span className="modal-action-desc">Send invitation by email</span>
                  </div>
                </div>
                <svg className="modal-action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* invite manually button */}
              <button onClick={() => navigate(`/invite-friends?id=${createdKameti._id}`)} className="modal-action-btn">
                <div className="modal-action-content">
                  <div className="modal-action-icon icon-bg-indigo">
                    <svg className="icon-svg-sm icon-text-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="modal-action-text">
                    <span className="modal-action-title">Invite Friends Manually</span>
                    <span className="modal-action-desc">Add members by email/phone</span>
                  </div>
                </div>
                <svg className="modal-action-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* bottom actions */}
            <div className="modal-bottom-actions">
              <button onClick={() => navigate('/dashboard')} className="btn-secondary full-width">
                Go to Dashboard
              </button>
              <button onClick={() => navigate(`/kameti-details/${createdKameti._id}`)} className="btn-primary full-width">
                View Kameti Details
              </button>
            </div>
      </div>
        </div>
      )}
    </div>
  );
};

export default CreateKameti;
