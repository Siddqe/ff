import express from 'express';
import SalaryTemplate from '../models/SalaryTemplate.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all salary templates
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const templates = await SalaryTemplate.find().sort({ createdAt: -1 });
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching salary templates:', error);
    res.status(500).json({ message: 'Server error while fetching salary templates' });
  }
});

// Get salary template by ID
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const template = await SalaryTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Salary template not found' });
    }
    res.json({ template });
  } catch (error) {
    console.error('Error fetching salary template:', error);
    res.status(500).json({ message: 'Server error while fetching salary template' });
  }
});

// Get salary template by designation
router.get('/designation/:designation', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const template = await SalaryTemplate.getTemplateByDesignation(req.params.designation);
    if (!template) {
      return res.status(404).json({ message: 'Salary template not found for this designation' });
    }
    res.json({ template });
  } catch (error) {
    console.error('Error fetching salary template by designation:', error);
    res.status(500).json({ message: 'Server error while fetching salary template' });
  }
});

// Create salary template
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const {
      designation,
      basicSalary,
      earnings = [],
      deductions = [],
      remainingLeaves = 0
    } = req.body;

    // Validate required fields
    if (!designation || !basicSalary) {
      return res.status(400).json({ 
        message: 'Designation and basic salary are required' 
      });
    }

    // Check if template already exists for this designation
    const existingTemplate = await SalaryTemplate.findOne({ 
      designation: new RegExp(`^${designation}$`, 'i')
    });

    if (existingTemplate) {
      return res.status(400).json({ 
        message: `Salary template already exists for designation: ${designation}` 
      });
    }

    const templateData = {
      designation,
      basicSalary: parseFloat(basicSalary),
      earnings: Array.isArray(earnings) ? earnings.map(earning => ({
        type: earning.type || 'Additional Earning',
        amount: parseFloat(earning.amount) || 0,
        percentage: parseFloat(earning.percentage) || 0,
        calculationType: earning.calculationType || 'amount'
      })) : [],
      deductions: Array.isArray(deductions) ? deductions.map(deduction => ({
        type: deduction.type || 'Deduction',
        amount: parseFloat(deduction.amount) || 0,
        percentage: parseFloat(deduction.percentage) || 0,
        calculationType: deduction.calculationType || 'amount'
      })) : [],
      remainingLeaves: parseInt(remainingLeaves) || 0
    };

    const template = new SalaryTemplate(templateData);
    await template.save();

    res.status(201).json({
      message: 'Salary template created successfully',
      template
    });
  } catch (error) {
    console.error('Error creating salary template:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Salary template already exists for this designation' 
      });
    }

    res.status(500).json({ 
      message: 'Server error while creating salary template',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update salary template
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const template = await SalaryTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({ message: 'Salary template not found' });
    }
    
    res.json({ 
      message: 'Salary template updated successfully', 
      template 
    });
  } catch (error) {
    console.error('Error updating salary template:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors 
      });
    }
    
    res.status(500).json({ message: 'Server error while updating salary template' });
  }
});

// Delete salary template
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const template = await SalaryTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Salary template not found' });
    }
    
    res.json({ message: 'Salary template deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary template:', error);
    res.status(500).json({ message: 'Server error while deleting salary template' });
  }
});

// Update template status
router.patch('/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "active" or "inactive".' });
    }

    const template = await SalaryTemplate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!template) {
      return res.status(404).json({ message: 'Salary template not found' });
    }
    
    res.json({ 
      message: `Salary template ${status} successfully`, 
      template 
    });
  } catch (error) {
    console.error('Error updating template status:', error);
    res.status(500).json({ message: 'Server error while updating template status' });
  }
});

export default router;