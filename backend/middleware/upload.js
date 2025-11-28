// middleware/upload.js
import multer from 'multer';
import path from 'path';
 
// Configure storage - use memory storage for Cloudinary
const storage = multer.memoryStorage(); // This is better for Cloudinary
 
// File filter
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, etc.)'), false);
  }
};
 
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only one file
  }
});
 
// Error handling middleware
upload.errorHandler = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please select an image smaller than 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Please upload only one image at a time.'
      });
    }
  }
  next(error);
};
 
export default upload;
 