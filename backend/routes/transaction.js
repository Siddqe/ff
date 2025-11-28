import express from 'express';
import multer from 'multer';
import Transaction from '../models/Transaction.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import ExcelJS from 'exceljs';  
import { addTransaction,
         deleteTransaction,
         downloadAttachment,
         downloadExcel,
         filterTransaction,
         getSingleTransaction,
         getTransactionStats,
         updateTransaction
} from '../Controllers/transactionController.js';
 
const router = express.Router();
 
// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
   
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, DOCX, XLSX files are allowed.'));
    }
  }
});
 
// Download transactions as Excel
router.get('/export/excel',authenticateToken, requireRole('admin'), downloadExcel);
 
 
// Get all transactions with filters
router.get('/', authenticateToken, requireRole('admin'), filterTransaction);
 
// Get single transaction
router.get('/:id', authenticateToken, requireRole('admin'), getSingleTransaction);
 
// Create new transaction with file upload
router.post('/', authenticateToken, requireRole('admin'), upload.single('attachment'), addTransaction );
 
// Download attachment
router.get('/:id/attachment', authenticateToken, requireRole('admin'), downloadAttachment);
 
// Update transaction
router.put('/:id', authenticateToken, requireRole('admin'), updateTransaction);
 
// Delete transaction
router.delete('/:id', authenticateToken, requireRole('admin'), deleteTransaction);
 
// Get transaction statistics
router.get('/stats/summary', authenticateToken, requireRole('admin'), getTransactionStats);
 
export default router;