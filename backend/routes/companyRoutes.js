import express from "express";
import Company from '../models/Company.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getCompany, updateCompany,uploadImage,deleteImage } from "../Controllers/companyController.js";
import upload from '../middleware/upload.js';
 
const router = express.Router();
 
/* ==========================
   GET Company Info
========================== */
router.get("/", authenticateToken, requireRole('admin'), getCompany);
 
/* ==========================
   PUT Company Info (Update or Create)
========================== */
router.put("/", authenticateToken, requireRole('admin'), updateCompany);
 
router.post('/upload-image', upload.single('image'), uploadImage);
router.delete('/delete-image/:type',authenticateToken,requireRole('admin'), deleteImage);
 
export default router;