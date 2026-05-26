import React, { useState } from 'react';
import api from '../../services/api';
import './Login.css';

const ForgotPassword = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(response.data.message);
      setTimeout(() => {
        onSuccess(email);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <div className="lock-icon">🔒</div>
          <h2>Forgot Password?</h2>
          <p>Enter your email address and we'll send you an OTP to reset your password.</p>
        </div>

        {error && <div className="enhanced-error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send Reset OTP'}
          </button>

          <button type="button" className="back-to-login" onClick={onBack}>
            ← Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;