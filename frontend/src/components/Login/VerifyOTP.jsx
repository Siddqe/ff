import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import './Login.css';

const VerifyOTP = ({ email, onBack, onVerified }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown timer
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, canResend]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp: otpValue
      });
      
      if (response.data.verified) {
        onVerified(otpValue);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/resend-otp', { email });
      setTimer(300);
      setCanResend(false);
      setError('');
      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-card">
        <div className="verify-otp-header">
          <div className="mail-icon">📧</div>
          <h2>Verify OTP</h2>
          <p>We've sent a 6-digit verification code to</p>
          <p className="email-display">{email}</p>
        </div>

        {error && <div className="enhanced-error-message">{error}</div>}

        <div className="otp-input-group">
          <label>Enter OTP Code</label>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="otp-input"
                disabled={loading}
              />
            ))}
          </div>
        </div>

        <div className="timer-section">
          {!canResend ? (
            <p className="timer-text">OTP expires in: <span>{formatTime(timer)}</span></p>
          ) : (
            <button type="button" className="resend-btn" onClick={handleResend} disabled={loading}>
              Resend OTP
            </button>
          )}
        </div>

        <button className="signin-btn" onClick={handleVerify} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <button type="button" className="back-to-login" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
};

export default VerifyOTP;