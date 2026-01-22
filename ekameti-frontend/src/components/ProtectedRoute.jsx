import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  // #region agent log
  try {
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H7',
        location: 'components/ProtectedRoute.jsx',
        message: token ? 'ProtectedRoute allow' : 'ProtectedRoute redirect (no token)',
        data: { path: window.location.pathname, hasToken: !!token },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (_) {}
  // #endregion

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
