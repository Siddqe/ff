import Company from '../models/Company.js';
import cloudinary from '../config/cloudinary.js';
 
//get company info
export const getCompany = async (req, res) => {
  try {
    const company = await Company.findOne();
    if (!company) {
      return res.json({
        success: true,
        message: "No company info found",
        data: {},
      });
    }
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching company information",
      error: error.message,
    });
  }
};
 
//put company info (Update or Create)
 
export const updateCompany = async (req, res) => {
  try {
    const {
      companyName,
      address,
      phone,
      email,
      taxId,
      currency,
      website,
      fiscalYear,
    } = req.body;
 
    if (!address) {
      return res
        .status(400)
        .json({ success: false, message: "Company address is required" });
    }
 
    let company = await Company.findOne();
 
    if (company) {
      company.companyName = companyName || company.companyName;
      company.address = address;
      company.phone = phone;
      company.email = email;
      company.taxId = taxId;
      company.currency = currency;
      company.website = website;
      company.fiscalYear = fiscalYear;
      await company.save();
    } else {
      company = await Company.create({
        companyName,
        address,
        phone,
        email,
        taxId,
        currency,
        website,
        fiscalYear,
      });
    }
 
    res.json({
      success: true,
      message: "Company information updated successfully",
      data: company,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating company information",
      error: error.message,
    });
  }
};
 
export const uploadImage = async (req, res) => {
  try {
    console.log('Upload image request received:', {
      type: req.body.type,
      file: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? `Buffer present (${req.file.buffer.length} bytes)` : 'No buffer'
      } : 'No file'
    });
 
    const { type } = req.body; // 'logo' or 'signature'
   
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }
 
    if (!['logo', 'signature'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type. Must be 'logo' or 'signature'"
      });
    }
 
    // Check if buffer exists
    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "File buffer is missing. Please try uploading again."
      });
    }
 
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({});
    }
 
    // Delete old image from Cloudinary if exists
    if (company[type]?.public_id) {
      try {
        await cloudinary.uploader.destroy(company[type].public_id);
        console.log(`Deleted old ${type} image: ${company[type].public_id}`);
      } catch (deleteError) {
        console.warn(`Could not delete old ${type} image:`, deleteError.message);
        // Continue with upload even if deletion fails
      }
    }
 
    // Upload new image to Cloudinary using buffer
    console.log('Uploading to Cloudinary using buffer...');
   
    const uploadOptions = {
      folder: 'company-assets',
      resource_type: 'image',
      timeout: 30000 // 30 seconds timeout
    };
 
    // Add transformations based on image type
    if (type === 'logo') {
      uploadOptions.transformation = [
        { width: 300, height: 300, crop: 'limit', quality: 'auto' }
      ];
    } else {
      uploadOptions.transformation = [
        { width: 200, height: 100, crop: 'limit', quality: 'auto' }
      ];
    }
 
    // Convert buffer to base64 and upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
      uploadOptions
    );
   
    console.log('Cloudinary upload successful:', {
      public_id: result.public_id,
      url: result.secure_url
    });
 
    // Update company with new image
    company[type] = {
      public_id: result.public_id,
      url: result.secure_url
    };
 
    await company.save();
 
    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`,
      data: company
    });
  } catch (error) {
    console.error('Error in uploadImage:', error);
   
    // More specific error messages
    let errorMessage = "Error uploading image";
    if (error.message.includes('timeout')) {
      errorMessage = "Upload timeout. Please try again.";
    } else if (error.message.includes('credentials') || error.message.includes('Invalid credentials')) {
      errorMessage = "Cloudinary configuration error. Please check server settings.";
    } else if (error.http_code === 413) {
      errorMessage = "File too large. Please select a smaller image.";
    } else if (error.message.includes('Upload preset')) {
      errorMessage = "Cloudinary upload preset error. Please check configuration.";
    }
 
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
 
export const deleteImage = async (req, res) => {
  try {
    const { type } = req.params;
 
    if (!['logo', 'signature'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid image type"
      });
    }
 
    let company = await Company.findOne();
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }
 
    // Delete image from Cloudinary if exists
    if (company[type]?.public_id) {
      await cloudinary.uploader.destroy(company[type].public_id);
    }
 
    // Remove image reference from company
    company[type] = { public_id: '', url: '' };
    await company.save();
 
    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      data: company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting image",
      error: error.message
    });
  }
};
 