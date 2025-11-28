import express from "express";
import multer from "multer";
import { 
  generateInvoice, 
  getInvoices,
  getInvoiceById,
  verifyPayment, 
  deleteInvoice,
  downloadInvoice,
  getPaymentProof,
  getInvoicePaymentProof,
  updateInvoice,
  getActiveInvoices, // ADD THIS IMPORT
  getDisabledInvoices, // ADD THIS IMPORT
  disableInvoice, // ADD THIS IMPORT
  restoreInvoice, // ADD THIS IMPORT
  permanentDeleteInvoice,// ADD THIS IMPORT
getInvoiceDownloadUrl
} from "../Controllers/invoiceController.js";
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Invoice routes

router.get("/invoices/active", authenticateToken, requireRole('admin'), getActiveInvoices); // ADD THIS ROUTE

router.post("/generate-invoice", authenticateToken, requireRole('admin'), generateInvoice);
router.get("/invoices", authenticateToken, requireRole('admin'), getInvoices);
router.get("/invoices/disabled", authenticateToken, requireRole('admin'), getDisabledInvoices); // ADD THIS ROUTE

router.get("/invoices/:id", authenticateToken, requireRole('admin'), getInvoiceById);
router.get("/invoices/:id/download", authenticateToken, requireRole('admin'), downloadInvoice);
router.put("/invoices/:id", authenticateToken, requireRole('admin'), updateInvoice);
router.delete("/invoices/:id", authenticateToken, requireRole('admin'), deleteInvoice);
router.patch("/invoices/:id/disable", authenticateToken, requireRole('admin'), disableInvoice); // ADD THIS ROUTE
router.patch("/invoices/:id/restore", authenticateToken, requireRole('admin'), restoreInvoice); // ADD THIS ROUTE
router.delete("/invoices/:id/permanent", authenticateToken, requireRole('admin'), permanentDeleteInvoice); // ADD THIS ROUTE
router.get('/invoices/:id/payment-proof', getInvoicePaymentProof);

router.post("/verify-payment", upload.single('transactionProof'), verifyPayment);
router.get('/payment-proofs/:filename', getPaymentProof);
router.get('/:invoiceId/download-url', getInvoiceDownloadUrl);


export default router;