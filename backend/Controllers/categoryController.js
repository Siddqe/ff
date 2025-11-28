import mongoose from 'mongoose';
import Category from '../models/Category.js';

// @desc    Get all categories grouped by type with statistics
// @route   GET /api/categories
// @access  Private/Admin
export const getAllCategories = async (req, res) => {
  try {
    // Get categories for each type in parallel
    const [employeeRoles, designations, transactionIncome, transactionExpense, stats] = await Promise.all([
      Category.getCategoriesByType('employee-role'),
      Category.getCategoriesByType('employee-designation'),
      Category.getCategoriesByType('transaction-income'),
      Category.getCategoriesByType('transaction-expense'),
      Category.getCategoryStats()
    ]);

    res.json({
      success: true,
      data: {
        'employee-role': employeeRoles,
        'employee-designation': designations,
        'transaction-income': transactionIncome,
        'transaction-expense': transactionExpense
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching all categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get categories by specific type
// @route   GET /api/categories/:type
// @access  Private/Admin
export const getCategoriesByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate category type
    const validTypes = ['employee-role', 'employee-designation', 'transaction-income', 'transaction-expense'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type'
      });
    }

    const categories = await Category.getCategoriesByType(type);
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error(`Error fetching ${type} categories:`, error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get transaction categories (both income and expense)
// @route   GET /api/categories/transaction/all
// @access  Private
export const getTransactionCategories = async (req, res) => {
  try {
    const categories = await Category.getTransactionCategories();
   
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching transaction categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction categories',
      error: error.message
    });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  try {
    const { name, type, description } = req.body;

    console.log('Creating category:', { name, type, description });

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }

    // Validate category type
    const validTypes = ['employee-role', 'employee-designation', 'transaction-income', 'transaction-expense'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.categoryExists(name, type);
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: `Category '${name}' already exists in ${type}`
      });
    }

    // Create category - TEMPORARY: Use a default user ID for testing
    const category = await Category.create({
      name: name.trim(),
      type,
      description: description?.trim(),
      createdBy: req.user?.id || new mongoose.Types.ObjectId()// Temporary for testing
    });

    // Return created category without sensitive info
    const categoryResponse = await Category.findById(category._id)
      .select('name description type createdAt');

    console.log('Category created successfully:', categoryResponse);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: categoryResponse
    });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    console.log('Updating category:', { id, name, description });

    // Find category
    let category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name already exists (if name is being updated)
    if (name && name !== category.name) {
      const existingCategory = await Category.categoryExists(name, category.type);
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: `Category '${name}' already exists in ${category.type}`
        });
      }
    }

    // Update category
    category = await Category.findByIdAndUpdate(
      id,
      { 
        name: name ? name.trim() : category.name,
        description: description !== undefined ? description.trim() : category.description
      },
      { new: true, runValidators: true }
    ).select('name description type createdAt');

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// @desc    Delete category (soft delete)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting category:', id);

    const category = await Category.findByIdAndDelete(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

// @desc    Get popular category suggestions
// @route   GET /api/categories/suggestions/:type
// @access  Private/Admin
export const getCategorySuggestions = async (req, res) => {
  try {
    const { type } = req.params;
    
    // Validate category type
    const validTypes = ['employee-role', 'employee-designation', 'transaction-income', 'transaction-expense'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category type'
      });
    }

    // Get most popular categories from the database (most frequently used)
    const suggestions = await Category.aggregate([
      { $match: { type, isActive: true } },
      {
        $group: {
          _id: '$name',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { name: '$_id', _id: 0 } }
    ]);

    const suggestionNames = suggestions.map(s => s.name);

    // If no suggestions in database, return some default ones
    if (suggestionNames.length === 0) {
      const defaultSuggestions = {
        'employee-role': ['Software Developer', 'Project Manager', 'UI/UX Designer', 'QA Engineer', 'DevOps Engineer'],
        'employee-designation': ['Junior', 'Senior', 'Team Lead', 'Manager', 'Director'],
        'transaction-category': ['Salary', 'Office Rent', 'Software Licenses', 'Marketing', 'Travel']
      };
      suggestionNames.push(...defaultSuggestions[type] || []);
    }

    res.json({
      success: true,
      data: suggestionNames
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestions',
      error: error.message
    });
  }
};