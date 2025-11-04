import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../components/NavBar';
import { getApiUrl } from '../config/api';
import '../styles/Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    verified: false,
    backupCodesCount: 0
  });
  const [show2FADisableModal, setShow2FADisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    country: 'Pakistan'
  });

  const [securityInfo, setSecurityInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    language: 'English',
    currency: 'PKR',
    notifications: {
      email: true,
      sms: true,
      push: true,
      marketing: false
    }
  });

  useEffect(() => {
    // Get user data from localStorage
    const storedUser = JSON.parse(localStorage.getItem('ekametiUser')) || {};
    setUser(storedUser);
    
    // Set form data
    setPersonalInfo({
      fullName: storedUser.fullName || '',
      email: storedUser.email || '',
      phone: storedUser.phone || '',
      dateOfBirth: storedUser.dateOfBirth || '',
      address: storedUser.address || '',
      city: storedUser.city || '',
      country: storedUser.country || 'Pakistan'
    });

    setPreferences({
      language: storedUser.language || 'English',
      currency: storedUser.currency || 'PKR',
      notifications: storedUser.notifications || {
        email: true,
        sms: true,
        push: true,
        marketing: false
      }
    });

    // Fetch 2FA status
    fetch2FAStatus();

    setLoading(false);
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(getApiUrl('2fa/status'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTwoFactorStatus({
        enabled: response.data.twoFactorEnabled,
        verified: response.data.twoFactorVerified,
        backupCodesCount: response.data.backupCodesCount
      });
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error);
    }
  };

  const handleEnable2FA = () => {
    navigate('/2fa-setup');
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      alert('Please enter your password');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        getApiUrl('2fa/disable'),
        { password: disablePassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('2FA has been disabled successfully');
      setShow2FADisableModal(false);
      setDisablePassword('');
      fetch2FAStatus();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSecurityInfoChange = (e) => {
    const { name, value } = e.target;
    setSecurityInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setPreferences(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [name]: checked
        }
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSavePersonalInfo = async () => {
    try {
      // Update user data
      const updatedUser = { ...user, ...personalInfo };
      localStorage.setItem('ekametiUser', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      
      // Show success message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (securityInfo.newPassword !== securityInfo.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (securityInfo.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }

    try {
      // Here you would make an API call to change password
      console.log('Changing password...');
      setSecurityInfo({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password. Please try again.');
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setSecurityInfo({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const updatedUser = { ...user, photo: event.target.result };
        localStorage.setItem('ekametiUser', JSON.stringify(updatedUser));
        setUser(updatedUser);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ekametiUser');
    localStorage.removeItem('ekametiToken');
    navigate('/login');
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' }
  ];

  if (loading) {
    return (
      <div className="profile-container">
        <NavBar />
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <NavBar />

      {/* Hero Section */}
      <div className="profile-hero">
        <div className="hero-content">
          <h1 className="hero-title">Profile Settings</h1>
          <p className="hero-subtitle">Manage your account and preferences</p>
        </div>
        </div>

      {/* Main Content */}
      <div className="profile-main">
        <div className="profile-content-wrapper">
          
          {/* Content Area */}
        <div className="profile-content">
            
            {/* Tabs */}
            <div className="profile-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div className="content-section">
                  <div className="section-header">
                    <h3>Personal Information</h3>
                    <button 
                      className="edit-btn"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  
                  {/* Profile Photo Section */}
                  <div className="profile-photo-section-inline">
            <div className="photo-wrapper">
                      <img 
                        src={user.photo || `https://ui-avatars.com/api/?name=${user.fullName || 'User'}&background=3b82f6&color=fff&size=120`} 
                        alt="Profile" 
                        className="profile-photo" 
                      />
              <input
                type="file"
                id="photo-upload"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
                      <label htmlFor="photo-upload" className="photo-upload-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </label>
                    </div>
                    <div className="photo-info">
                      <h4>{user.fullName || 'User Name'}</h4>
                      <p>{user.email || 'user@example.com'}</p>
            </div>
          </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={personalInfo.fullName}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={personalInfo.email}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={personalInfo.phone}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={personalInfo.dateOfBirth}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group full-width">
                      <label>Address</label>
                      <input
                        type="text"
                        name="address"
                        value={personalInfo.address}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        name="city"
                        value={personalInfo.city}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Country</label>
                      <select
                        name="country"
                        value={personalInfo.country}
                        onChange={handlePersonalInfoChange}
                        disabled={!isEditing}
                        className="form-input"
                      >
                        <option value="Pakistan">Pakistan</option>
                        <option value="India">India</option>
                        <option value="USA">USA</option>
                        <option value="UK">UK</option>
                      </select>
                    </div>
                  </div>
                  
                  {isEditing && (
                    <div className="form-actions">
                      <button className="save-btn" onClick={handleSavePersonalInfo}>
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="content-section">
                  <div className="section-header">
                    <h3>Security Settings</h3>
                  </div>
                  
                  <div className="security-section">
                    <div className="security-item">
                      <div className="security-info">
                        <h4>Change Password</h4>
                        <p>Update your password to keep your account secure</p>
                      </div>
                      
                      {!showPasswordForm ? (
                        <div className="security-action">
                          <button 
                            className="change-password-btn" 
                            onClick={() => setShowPasswordForm(true)}
                          >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Change Password
                          </button>
                        </div>
                      ) : (
                        <div className="security-form">
                          <div className="form-group">
                            <label>Current Password</label>
                            <input
                              type="password"
                              name="currentPassword"
                              value={securityInfo.currentPassword}
                              onChange={handleSecurityInfoChange}
                              className="form-input"
                              placeholder="Enter current password"
                            />
                          </div>
                          <div className="form-group">
                            <label>New Password</label>
                            <input
                              type="password"
                              name="newPassword"
                              value={securityInfo.newPassword}
                              onChange={handleSecurityInfoChange}
                              className="form-input"
                              placeholder="Enter new password"
                            />
                          </div>
                          <div className="form-group">
                            <label>Confirm New Password</label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={securityInfo.confirmPassword}
                              onChange={handleSecurityInfoChange}
                              className="form-input"
                              placeholder="Confirm new password"
                            />
                          </div>
                          <div className="password-form-actions">
                            <button className="save-password-btn" onClick={handleChangePassword}>
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save Password
                            </button>
                            <button className="cancel-password-btn" onClick={handleCancelPasswordChange}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="security-item">
                      <div className="security-info">
                        <h4>Two-Factor Authentication</h4>
                        <p>Add an extra layer of security to your account</p>
                        {twoFactorStatus.enabled && twoFactorStatus.backupCodesCount > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            {twoFactorStatus.backupCodesCount} backup codes remaining
                          </p>
                        )}
                      </div>
                      <div className="security-action">
                        <span className={`status-badge ${twoFactorStatus.enabled ? 'enabled' : 'disabled'}`}>
                          {twoFactorStatus.enabled ? '✓ Enabled' : 'Disabled'}
                        </span>
                        {!twoFactorStatus.enabled ? (
                          <button className="enable-2fa-btn" onClick={handleEnable2FA}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Enable 2FA
                          </button>
                        ) : (
                          <button 
                            className="disable-2fa-btn" 
                            onClick={() => setShow2FADisableModal(true)}
                            style={{ backgroundColor: '#dc2626', color: 'white' }}
                          >
                            Disable 2FA
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2FA Disable Confirmation Modal */}
                    {show2FADisableModal && (
                      <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                      }}>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '24px',
                          borderRadius: '12px',
                          maxWidth: '400px',
                          width: '90%'
                        }}>
                          <h3 style={{ marginBottom: '16px' }}>Disable Two-Factor Authentication?</h3>
                          <p style={{ marginBottom: '16px', color: '#666' }}>
                            Enter your password to confirm disabling 2FA. This will make your account less secure.
                          </p>
                          <input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your password"
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '8px',
                              marginBottom: '16px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                              onClick={() => {
                                setShow2FADisableModal(false);
                                setDisablePassword('');
                              }}
                              style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDisable2FA}
                              style={{
                                flex: 1,
                                padding: '12px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              Disable 2FA
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="security-item">
                      <div className="security-info">
                        <h4>Login Sessions</h4>
                        <p>Manage your active login sessions</p>
                      </div>
                      <div className="security-action">
                        <span className="session-info">Current session active</span>
                        <button className="logout-all-btn">Logout All Sessions</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="content-section">
                  <div className="section-header">
                    <h3>Preferences</h3>
                  </div>
                  
                  <div className="preferences-section">
                    <div className="preference-group">
                      <h4>Language & Region</h4>
                      <div className="form-grid">
                        <div className="form-group">
                          <label>Language</label>
                          <select
                            name="language"
                            value={preferences.language}
                            onChange={handlePreferenceChange}
                            className="form-input"
                          >
                            <option value="English">English</option>
                            <option value="Urdu">Urdu</option>
                            <option value="Arabic">Arabic</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Currency</label>
                          <select
                            name="currency"
                            value={preferences.currency}
                            onChange={handlePreferenceChange}
                            className="form-input"
                          >
                            <option value="PKR">PKR (Pakistani Rupee)</option>
                            <option value="USD">USD (US Dollar)</option>
                            <option value="EUR">EUR (Euro)</option>
                          </select>
              </div>
            </div>
          </div>

                    <div className="preference-group">
                      <h4>Notifications</h4>
                      <div className="notification-options">
                        <div className="notification-item">
                          <div className="notification-info">
                            <h5>Email Notifications</h5>
                            <p>Receive updates via email</p>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              name="email"
                              checked={preferences.notifications.email}
                              onChange={handlePreferenceChange}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        
                        <div className="notification-item">
                          <div className="notification-info">
                            <h5>SMS Notifications</h5>
                            <p>Receive updates via SMS</p>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              name="sms"
                              checked={preferences.notifications.sms}
                              onChange={handlePreferenceChange}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        
                        <div className="notification-item">
                          <div className="notification-info">
                            <h5>Push Notifications</h5>
                            <p>Receive browser notifications</p>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              name="push"
                              checked={preferences.notifications.push}
                              onChange={handlePreferenceChange}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                        
                        <div className="notification-item">
                          <div className="notification-info">
                            <h5>Marketing Emails</h5>
                            <p>Receive promotional content</p>
                          </div>
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              name="marketing"
                              checked={preferences.notifications.marketing}
                              onChange={handlePreferenceChange}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

      {/* Logout Button */}
      <div className="profile-actions">
        <button className="logout-btn" onClick={handleLogout}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;