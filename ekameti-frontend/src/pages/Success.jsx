import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Register.css'; // or Success.css

const Success = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('ekametiUser'));

  const handleStart = () => {
    navigate('/dashboard');
  };

  return (
    <div className="register-container">
      <div className="success-box">
        <h1 className="brand">eKameti</h1>
        <h2 className="success-title">Congratulations!</h2>
        <p className="success-message">
          {user?.name ? `“${user.name}”` : ''} your account is now created.
        </p>
        <button onClick={handleStart} className="success-button">
          Start Using eKameti
        </button>
      </div>
    </div>
  );
};

export default Success;
