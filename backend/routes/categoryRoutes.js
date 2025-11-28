import express from 'express';
import {
  getAllCategories,
  getCategoriesByType,
  getTransactionCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySuggestions
} from '../Controllers/categoryController.js';
 
const router = express.Router();
 
// TEMPORARY: Remove auth for testing - Add back later
// import { authenticateToken, requireRole } from '../middleware/auth.js';
// router.use(authenticateToken);
// router.use(requireRole('admin'));
 
// @route   GET /api/categories
// @desc    Get all categories grouped by type with statistics
router.get('/', getAllCategories);
 
// @route   GET /api/categories/transaction/all
// @desc    Get all transaction categories (income and expense)
router.get('/transaction/all', getTransactionCategories);
 
// @route   GET /api/categories/:type
// @desc    Get categories by specific type
router.get('/:type', getCategoriesByType);
 
// @route   GET /api/categories/suggestions/:type
// @desc    Get popular category suggestions
router.get('/suggestions/:type', getCategorySuggestions);
 
// @route   POST /api/categories
// @desc    Create new category
router.post('/', createCategory);
 
// @route   PUT /api/categories/:id
// @desc    Update category
router.put('/:id', updateCategory);
 
// @route   DELETE /api/categories/:id
// @desc    Delete category
router.delete('/:id', deleteCategory);
 
export default router;