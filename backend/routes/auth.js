import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js'
import crypto from 'crypto';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetOTP } from '../services/emailService.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendEmployeeCredentials } from '../services/emailService.js';
 
const router = express.Router();
 
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
 
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
 
    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
 
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
 
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
 
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        personId: user.personId,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});
 
// Verify token
router.post('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
   
    if (!token) {
      return res.status(401).json({ valid: false, message: 'No token provided' });
    }
 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
   
    if (!user) {
      return res.status(401).json({ valid: false, message: 'User not found' });
    }
 
    res.json({ valid: true, user });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail, isActive: true });
    if (!user) {
      return res.status(404).json({ message: 'Email not found or inactive' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Password reset is allowed only for admin accounts' });
    }

    // Invalidate previous OTPs before issuing a new one
    await PasswordReset.updateMany(
      { email: normalizedEmail, isUsed: false },
      { isUsed: true }
    );

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to database
    await PasswordReset.create({
      email: user.email,
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP via email
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.personId || user.email.split('@')[0]);

    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }

    res.status(200).json({ 
      message: 'OTP sent to the registered admin email address.' 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    if (!user || user.role !== 'admin') {
      return res.status(400).json({ message: 'Invalid email or OTP' });
    }

    // Find valid OTP
    const resetRequest = await PasswordReset.findOne({
      email: normalizedEmail,
      otp: otp,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRequest) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ 
      message: 'OTP verified successfully',
      verified: true 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Password reset is allowed only for admin accounts' });
    }

    // Find valid OTP
    const resetRequest = await PasswordReset.findOne({
      email: normalizedEmail,
      otp: otp,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!resetRequest) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Update password (the pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    // Mark OTP as used
    resetRequest.isUsed = true;
    await resetRequest.save();

    res.status(200).json({ 
      message: 'Password reset successful. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isActive: true });

    if (!user) {
      return res.status(404).json({ message: 'Email not found or inactive' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'OTP resend is allowed only for admin accounts' });
    }

    // Mark all existing OTPs as used
    await PasswordReset.updateMany(
      { email: normalizedEmail, isUsed: false },
      { isUsed: true }
    );

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save new OTP
    await PasswordReset.create({
      email: user.email,
      otp: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    // Send new OTP
    const emailResult = await sendPasswordResetOTP(user.email, otp, user.personId || user.email.split('@')[0]);

    if (!emailResult.success) {
      return res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }

    res.status(200).json({ 
      message: 'A new OTP has been sent to your email address.' 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});
 
export default router;
 