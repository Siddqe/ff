import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import VerifyOTP from './VerifyOTP';
import ResetPassword from './ResetPassword';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetStep, setResetStep] = useState('forgot'); // 'forgot', 'verify', 'reset'

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetStep('forgot');
    setResetEmail('');
    setResetOtp('');
  };

  const handleOTPSent = (email) => {
    setResetEmail(email);
    setResetStep('verify');
  };

  const handleOTPVerified = (otp) => {
    setResetOtp(otp);
    setResetStep('reset');
  };

  const handlePasswordReset = (message) => {
    // Show success message and redirect to login
    alert(message); // You can replace this with a toast notification
    handleBackToLogin();
  };

  // Show forgot password flow
  if (showForgotPassword) {
    if (resetStep === 'forgot') {
      return <ForgotPassword onBack={handleBackToLogin} onSuccess={handleOTPSent} />;
    } else if (resetStep === 'verify') {
      return <VerifyOTP email={resetEmail} onBack={handleBackToLogin} onVerified={handleOTPVerified} />;
    } else if (resetStep === 'reset') {
      return <ResetPassword email={resetEmail} otp={resetOtp} onBack={handleBackToLogin} onSuccess={handlePasswordReset} />;
    }
  }

  // Show login form
  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="brand-content"></div>
      </div>

      <div className="login-right-panel">
        <div className="login-card">
          <div className="user-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-16 h-16"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0"
              />
            </svg>
          </div>

          <h2 className="login-title">ZYNITH-IT SOLUTIONS</h2>
          <h1 className="company-name">FINANCE PORTAL</h1>
          <div className="enhanced-divider"></div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="enhanced-error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                required
                placeholder="Enter your username or email"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Your password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                required
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <div className="form-options">
              <a href="#" className="forgot-password" onClick={handleForgotPassword}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="signin-btn" disabled={loading}>
              {loading ? (
                <span>
                  Signing in<span className="enhanced-loading-dots"></span>
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;