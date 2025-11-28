import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        personId: req.user.personId,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin only: Get all employees
router.get('/employees', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password')
      .populate('createdBy', 'personId email');
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin only: Delete employee
router.delete('/employees/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const employee = await User.findOne({ 
      _id: req.params.id, 
      role: 'employee' 
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;