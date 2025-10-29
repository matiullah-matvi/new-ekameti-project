import React from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/InviteFriends.css';

const InviteFriends = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const kametiId = params.get('id'); // Get Kameti ID from query param

  const inviteLink = `${window.location.origin}/join-kameti?id=${kametiId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    alert('📋 Link copied to clipboard!');
  };

  return (
    <div className="invite-container">
      <div className="invite-box">
        <h1 className="brand">eKameti</h1>
        <h2>🎉 Kameti Created!</h2>
        <p>You can invite friends to join your Kameti using this link:</p>
        <input className="invite-link" value={inviteLink} readOnly />
        <button className="copy-btn" onClick={handleCopy}>Copy Link</button>
      </div>
    </div>
  );
};

export default InviteFriends;
