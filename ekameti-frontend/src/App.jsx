import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 📄 Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Success from './pages/Success';
import Dashboard from './pages/Dashboard';
import CreateKameti from './pages/CreateKameti';
import InviteFriends from './pages/InviteFriends';
import JoinKameti from './pages/JoinKameti';
import Updates from './pages/Updates';
import Records from './pages/Records';
import ViewKametis from './pages/ViewKametis';
import RegisterSuccess from './pages/RegisterSuccess';
import Profile from './pages/Profile';
import AllKametis from './pages/AllKametis';
import MyKametis from './pages/MyKametis';
import Notifications from './pages/Notifications';
import VerifyOTP from './pages/VerifyOTP';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import GoogleAuthCallback from './pages/GoogleAuthCallback';
import CompleteProfile from './pages/CompleteProfile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TwoFactorSetup from './pages/TwoFactorSetup';

// ✅ Safe Wrapper to prevent KametiDetails crash
import SafeKametiDetails from './pages/SafeKametiDetails';

// ✅ Protected Route
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-success" element={<RegisterSuccess />} />
        <Route path="/success" element={<Success />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/all-kametis" element={<AllKametis />} />
        <Route path="/auth/google/success" element={<GoogleAuthCallback />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* 2FA Setup (Protected) */}
        <Route
          path="/2fa-setup"
          element={
            <ProtectedRoute>
              <TwoFactorSetup />
            </ProtectedRoute>
          }
        />

        {/* PayFast Redirect Pages */}
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-kameti"
          element={
            <ProtectedRoute>
              <CreateKameti />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invite-friends"
          element={
            <ProtectedRoute>
              <InviteFriends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join-kameti/:id"
          element={
            <ProtectedRoute>
              <JoinKameti />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kameti/:id"
          element={
            <ProtectedRoute>
              <SafeKametiDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kameti-details/:id"
          element={
            <ProtectedRoute>
              <SafeKametiDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/updates"
          element={
            <ProtectedRoute>
              <Updates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/records"
          element={
            <ProtectedRoute>
              <Records />
            </ProtectedRoute>
          }
        />
        <Route
          path="/view-kametis"
          element={
            <ProtectedRoute>
              <ViewKametis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-kametis"
          element={
            <ProtectedRoute>
              <MyKametis />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
