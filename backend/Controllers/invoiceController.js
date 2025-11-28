import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js'
import Company from '../models/Company.js';
import Transaction from '../models/Transaction.js';
import pkg from "number-to-words";
import axios from "axios";

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const { toWords } = pkg;

// Properly define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/payment-proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Generate dynamic Invoice PDF - FIXED CURRENCY FOR INR
const getCurrencySymbol = (currency) => {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    INR: 'Rs. '
  };
  return currencySymbols[currency] || '$';
};

// Fixed amount in words function for INR
const getAmountInWords = (amount, currency) => {
  try {
    const amountInWords = toWords(Math.round(amount));

    // Convert to Title Case (Camel-style words)
    const camelCaseWords = amountInWords.replace(/\w\S*/g,
      txt => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    );

    // Handle different currency names
    if (currency === 'INR') {
      return `${camelCaseWords} Rupees Only`;
    } else if (currency === 'EUR') {
      return `${camelCaseWords} Euros Only`;
    } else {
      return `${camelCaseWords} Dollars Only`;
    }

  } catch (error) {
    console.error("Error converting amount to words:", error);

    if (currency === 'INR') {
      return `${amount} Rupees Only`;
    } else if (currency === 'EUR') {
      return `${amount} Euros Only`;
    } else {
      return `${amount} Dollars Only`;
    }
  }
};


// Get invoice download URL for email attachment
export const getInvoiceDownloadUrl = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    console.log('📧 Generating download URL for invoice:', invoiceId);

    // Get invoice data
    const invoice = await Invoice.findById(invoiceId).populate("customerId");
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Return the PDF download URL
    const downloadUrl = `${req.protocol}://${req.get('host')}/api/invoices/${invoiceId}/download`;
    const fileName = `Invoice-${invoice.invoiceNumber || invoiceId}.pdf`;
    
    console.log('✅ Generated download URL:', { downloadUrl, fileName });

    res.json({
      success: true,
      downloadUrl: downloadUrl,
      fileName: fileName,
      invoiceNumber: invoice.invoiceNumber
    });

  } catch (error) {
    console.error('❌ Error generating download URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate download URL', 
      details: error.message 
    });
  }
};


// Format currency amount based on currency type
const formatCurrencyAmount = (amount, currency) => {
  if (currency === 'INR') {
    // Indian numbering system - comma after hundreds, thousands, etc.
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    // Western numbering system
    return amount.toFixed(2);
  }
};
// NEW FUNCTION: Create transaction when invoice is paid
const createTransactionForPaidInvoice = async (invoice, transactionNumber) => {
  try {
    console.log('🔄 Creating transaction for paid invoice:', invoice.invoiceNumber);
    
    // Prepare attachment data
    let attachment = null;
    if (invoice.paymentDetails?.proofFile) {
      const proofFile = invoice.paymentDetails.proofFile;
      
      console.log('📁 Payment proof file found:', {
        fileName: proofFile.fileName,
        filePath: proofFile.filePath,
        fileUrl: proofFile.fileUrl,
        size: proofFile.size
      });
      
      try {
        // Read the payment proof file from disk
        if (fs.existsSync(proofFile.filePath)) {
          const fileBuffer = fs.readFileSync(proofFile.filePath);
          
          console.log('✅ File read successfully, size:', fileBuffer.length, 'bytes');
          
          attachment = {
            filename: proofFile.fileName,
            originalName: proofFile.originalName,
            mimeType: proofFile.mimeType,
            size: proofFile.size,
            data: fileBuffer,
            fileUrl: proofFile.fileUrl // Store the URL for direct access
          };
          
          console.log(`📎 Payment proof file attached: ${proofFile.originalName}`);
        } else {
          console.log('❌ File does not exist at path:', proofFile.filePath);
          // Create attachment with URL only
          attachment = {
            filename: proofFile.fileName,
            originalName: proofFile.originalName,
            mimeType: proofFile.mimeType,
            size: proofFile.size,
            data: null,
            fileUrl: proofFile.fileUrl
          };
        }
      } catch (fileError) {
        console.error('❌ Error reading file:', fileError);
        // Create attachment with URL only as fallback
        attachment = {
          filename: proofFile.fileName,
          originalName: proofFile.originalName,
          mimeType: proofFile.mimeType,
          size: proofFile.size,
          data: null,
          fileUrl: proofFile.fileUrl
        };
      }
    } else {
      console.log('❌ No payment proof file found in invoice');
    }

    const transactionData = {
      description: `${invoice.invoiceNumber}`,
      amount: invoice.totalAmount,
      type: 'Income',
      category: 'Project Revenue',
      remarks: `Transaction ID: ${transactionNumber}`,
      date: new Date(),
      createdBy: 'system'
    };

    // Only add attachment if it exists
    if (attachment) {
      transactionData.attachment = attachment;
    }

    const transaction = new Transaction(transactionData);
    await transaction.save();
    
    console.log(`✅ Transaction created successfully: ${transaction._id}`);
    console.log(`📊 Transaction details:`, {
      description: transaction.description,
      amount: transaction.amount,
      hasAttachment: !!transaction.attachment,
      attachmentSize: transaction.attachment?.data?.length || 0
    });
    
    return transaction;
  } catch (error) {
    console.error("❌ Error creating transaction for paid invoice:", error);
    throw error;
  }
};

// SIMPLIFIED FUNCTION: Auto-calculate due date based on customer payment terms
const calculateDueDate = (invoiceDate, paymentTerms) => {
  if (!paymentTerms || !invoiceDate) {
    console.log('❌ Missing payment terms or invoice date for due date calculation');
    return null;
  }
  
  try {
    const invoiceDateObj = new Date(invoiceDate);
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(invoiceDateObj.getDate() + parseInt(paymentTerms));
    
    console.log(`📅 Due Date Calculation: ${invoiceDate} + ${paymentTerms} days = ${dueDateObj.toISOString().split('T')[0]}`);
    
    return dueDateObj;
  } catch (error) {
    console.error('❌ Error calculating due date:', error);
    return null;
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, items, invoiceDate, dueDate, taxPercent, notes, currency, status } = req.body; // ✅ Make sure status is included

    console.log('🔄 Updating invoice:', id);
    console.log('📦 Update data:', { status, customerId, items }); // Log the status

    // ✅ ENHANCED CHECK: FIND INVOICE WITH PAYMENT DETAILS
    const existingInvoice = await Invoice.findById(id).populate("customerId");
    if (!existingInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    console.log('📋 Existing invoice status:', {
      status: existingInvoice.status,
      paymentDetails: existingInvoice.paymentDetails,
      isPaid: existingInvoice.status === "paid"
    });

    // ✅ ONLY PREVENT EDITING FOR PAID INVOICES, NOT FOR STATUS CHANGES
    if (existingInvoice.status === "paid") {
      console.log('❌ Attempted to edit paid invoice:', existingInvoice.invoiceNumber);
      return res.status(400).json({ 
        message: "Cannot edit invoice that has been paid.",
        invoiceNumber: existingInvoice.invoiceNumber,
        status: existingInvoice.status
      });
    }

    // ✅ ADDITIONAL CHECK: If paymentDetails exist, consider it paid
    if (existingInvoice.paymentDetails && existingInvoice.paymentDetails.transactionNumber) {
      console.log('❌ Invoice has payment details, marking as non-editable');
      return res.status(400).json({ 
        message: "Cannot edit invoice that has payment verification. Edit functionality is disabled.",
        invoiceNumber: existingInvoice.invoiceNumber
      });
    }

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer ID and items are required" });
    }


    // Validate new fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.unitPrice === undefined || item.quantity === undefined) {
        return res.status(400).json({ 
          message: `Item ${i + 1}: unitPrice and quantity are required` 
        });
      }
    }

    // Fetch customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    //SIMPLIFIED AUTO-CALCULATION: Always calculate due date from payment terms
    let finalDueDate = null;
    if (customer.paymentTerms && invoiceDate) {
      finalDueDate = calculateDueDate(invoiceDate, customer.paymentTerms);
      console.log(`✅ Auto-calculated due date for update: ${finalDueDate?.toISOString().split('T')[0]} (${customer.paymentTerms} days from invoice date)`);
    }

    // If no due date could be calculated, use the existing due date
    if (!finalDueDate && existingInvoice.dueDate) {
      finalDueDate = existingInvoice.dueDate;
      console.log('ℹ️ Using existing due date from invoice');
    }

    // Calculate totals with new logic
    const subtotal = items.reduce((sum, item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (unitPrice * quantity);
    }, 0);
    
    const taxAmount = taxPercent ? (subtotal * taxPercent) / 100 : 0;
    const totalAmount = subtotal + taxAmount;

    console.log('💰 Calculated totals:', { subtotal, taxAmount, totalAmount });

    // Update invoice in DB with new fields
     const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        customerId,
        items: items.map(item => ({
          description: item.description,
          remarks: item.remarks || "",
          unitPrice: Number(item.unitPrice) || 0,
          quantity: Number(item.quantity) || 0,
          amount: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
        })),
        totalAmount,
        date: invoiceDate ? new Date(invoiceDate) : new Date(),
        dueDate: finalDueDate,
        taxPercent: taxPercent || 0,
        taxAmount,
        subtotal,
        notes: notes || '',
        currency: currency || "USD",
        status: status || existingInvoice.status // ✅ IMPORTANT: Include status update
      },
      { new: true, runValidators: true }
    ).populate("customerId");

    if (!updatedInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    console.log('✅ Invoice updated successfully:', updatedInvoice.invoiceNumber);

    res.json({
      message: "Invoice updated successfully",
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error("❌ Error updating invoice:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: "Error updating invoice", error: error.message });
  }
};

// Serve payment proof files
export const getPaymentProof = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);
   
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    // Set appropriate headers based on file type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
   
    // For images and PDFs, display in browser; for others, download
    if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Error serving payment proof:", error);
    res.status(500).json({ message: "Error serving file" });
  }
};
// Update invoice status in backend
// Update invoice status in backend
const updateInvoiceEmailStatus = async (invoiceId, invoice) => {
  try {
    const updateData = {
      status: 'sent', // ✅ THIS MUST BE 'sent' to change from draft to sent
      emailSent: true,
      emailSentAt: new Date(),
      // Include all required fields to avoid validation errors
      customerId: invoice.customerId._id,
      items: invoice.items.map(item => ({
        description: item.description,
        remarks: item.remarks || "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        amount: item.amount
      })),
      totalAmount: invoice.totalAmount,
      date: invoice.date,
      dueDate: invoice.dueDate,
      taxPercent: invoice.taxPercent || 0,
      notes: invoice.notes || '',
      currency: invoice.currency || 'USD'
    };

    console.log('🔄 Updating invoice status to "sent":', invoiceId);
    console.log('📤 Update data:', updateData);

    // Make sure this API call is working
    const response = await billingService.updateInvoice(invoiceId, updateData);
    console.log('✅ Invoice status updated to "sent" successfully');
    
    return response;
  } catch (error) {
    console.error('❌ Error updating invoice status:', error);
    console.error('❌ Error details:', error.response?.data);
    throw error;
  }
};

// Get payment proof info for a specific invoice
export const getInvoicePaymentProof = async (req, res) => {
  try {
    const { id } = req.params;
   
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!invoice.paymentDetails?.proofFile) {
      return res.status(404).json({ message: "No payment proof found for this invoice" });
    }

    res.json({
      paymentProof: invoice.paymentDetails.proofFile
    });

  } catch (error) {
    console.error("Error fetching payment proof:", error);
    res.status(500).json({ message: "Error fetching payment proof", error: error.message });
  }
};

// Add this function to delete invoice
export const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
   
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // ✅ CHECK IF INVOICE IS PAID - PREVENT DELETION
    if (invoice.status === "paid") {
      return res.status(400).json({ 
        message: "Cannot delete invoice that has been paid. Paid invoices cannot be deleted." 
      });
    }

    // Delete associated payment proof file if exists
    if (invoice.paymentDetails?.proofFile?.filePath) {
      try {
        if (fs.existsSync(invoice.paymentDetails.proofFile.filePath)) {
          fs.unlinkSync(invoice.paymentDetails.proofFile.filePath);
        }
      } catch (fileError) {
        console.error("Error deleting payment proof file:", fileError);
      }
    }

    const deletedInvoice = await Invoice.findByIdAndDelete(id);
   
    res.json({ message: "Invoice deleted successfully" });
   
  } catch (error) {
    console.error("Error deleting invoice:", error);
    res.status(500).json({ message: "Error deleting invoice", error: error.message });
  }
};

// Update the generateInvoice function with new fields
export const generateInvoice = async (req, res) => {
  try {
    const { customerId, items, invoiceDate, dueDate, taxPercent, notes, currency } = req.body;

    // Validate required fields
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ message: "Customer ID and items are required" });
    }

    // Validate new fields
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.unitPrice === undefined || item.quantity === undefined) {
        return res.status(400).json({ 
          message: `Item ${i + 1}: unitPrice and quantity are required` 
        });
      }
    }

    // Fetch customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // ✅ ENFORCED AUTO-CALCULATION: ALWAYS calculate due date from payment terms
    let finalDueDate = null;
    
    if (customer.paymentTerms && invoiceDate) {
      finalDueDate = calculateDueDate(invoiceDate, customer.paymentTerms);
      console.log(`✅ ENFORCED Auto-calculated due date: ${finalDueDate?.toISOString().split('T')[0]} (${customer.paymentTerms} days from invoice date)`);
    } else {
      console.log('❌ Cannot calculate due date - missing payment terms or invoice date');
      return res.status(400).json({ 
        message: "Cannot generate invoice: Customer payment terms or invoice date is missing" 
      });
    }

    // Fetch company info from company settings
    let company = await Company.findOne();
    if (!company) {
      return res.status(404).json({ message: "Company information not found. Please set up company details first." });
    }

    // Fetch or create company info
    // let company = await Company.findOne();
    // if (!company) {
    //   // Create default company info if none exists
    //   company = await Company.create({
    //     companyName: 'Zynith IT Solutions',
    //     address: '123 Business Street, City, State 12345',
    //     phone: '+1 (555) 123-4567',
    //     email: 'contact@zynith-it.com',
    //     taxId: 'TAX-123456789',
    //     logo: { url: '' },
    //     signature: { url: '' }
    //   });
    // }
if (!company.companyName || !company.address) {
      console.log('❌ Company information incomplete:', {
        hasCompanyName: !!company.companyName,
        hasAddress: !!company.address
      });
      return res.status(400).json({ 
        message: "Company information is incomplete. Please complete company details in Company Settings." 
      });
    }
    let logoBuffer = null;
    let signatureBuffer = null;
 
    try {
      // Load logo from Cloudinary
      if (company.logo?.url) {
        const logoResponse = await axios({
          method: 'GET',
          url: company.logo.url,
          responseType: 'arraybuffer',
          timeout: 10000
        });
        logoBuffer = Buffer.from(logoResponse.data);
        console.log("✅ Logo loaded from Cloudinary for download");
      }
    } catch (logoError) {
      console.error("❌ Error loading logo from Cloudinary:", logoError.message);
    }
 
    try {
      // Load signature from Cloudinary
      if (company.signature?.url) {
        const signatureResponse = await axios({
          method: 'GET',
          url: company.signature.url,
          responseType: 'arraybuffer',
          timeout: 10000
        });
        signatureBuffer = Buffer.from(signatureResponse.data);
        console.log("✅ Signature loaded from Cloudinary for download");
      }
    } catch (signatureError) {
      console.error("❌ Error loading signature from Cloudinary:", signatureError.message);
    }

    // Calculate totals with new logic
    const subtotal = items.reduce((sum, item) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (unitPrice * quantity);
    }, 0);
    
    const taxAmount = taxPercent ? (subtotal * taxPercent) / 100 : 0;
    const grandTotal = subtotal + taxAmount;

    // Save invoice in DB with new fields
    const invoice = new Invoice({
      customerId,
      items: items.map(item => ({
        description: item.description,
        remarks: item.remarks || "",
        unitPrice: Number(item.unitPrice) || 0, // NEW FIELD
        quantity: Number(item.quantity) || 0, // NEW FIELD
        amount: (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0) // Auto-calculated
      })),
      totalAmount: grandTotal,
      date: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: finalDueDate, // Use ENFORCED auto-calculated due date
      taxPercent: taxPercent || 0,
      taxAmount,
      subtotal,
      notes,
      currency: currency || "USD",
      status: "draft"
    });
    await invoice.save();

    // Fetch the saved invoice to get the auto-generated numbers
    const savedInvoice = await Invoice.findById(invoice._id).populate("customerId");

    // PDF setup - stream directly to response
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true
    });
   
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${savedInvoice.invoiceNumber}.pdf`);
   
    doc.pipe(res);

    // ===== DYNAMIC POSITIONING VARIABLES =====
    let currentY = 30;
    const leftColumn = 50;
    const rightColumn = 350;
    const pageWidth = 550;
    const columnWidth = 200;

    // Get currency symbol and name
    const currencySymbol = getCurrencySymbol(currency);
    const amountWords = getAmountInWords(grandTotal, currency);

    // ===== LOGO SECTION =====
    const addHeader = (pageNumber) => {
      const headerY = 30;
     
      // ===== LOGO SECTION =====
      const logoWidth = 140;
      const logoHeight = 100;
      const logoX = pageWidth - logoWidth + 15;
     
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, logoX, 20, {
            width: logoWidth,
            height: logoHeight
          });
          console.log("✅ Company logo added to PDF");
        } catch (logoError) {
          console.error("❌ Error adding logo to PDF:", logoError.message);
        }
      }

      // ===== COMPANY INFO =====
      doc.fontSize(20).font('Helvetica-Bold')
         .text(company.companyName, leftColumn, headerY);

      doc.fontSize(10).font('Helvetica');
      const lineSpacing = 2;

      let currentY = headerY + 30;

      const addressText = company.address || "123 Main Street, City, ZIP";
      const addressWidth = pageWidth / 2;
      const addressHeight = doc.heightOfString(addressText, {
        width: addressWidth,
      });

      doc.text(addressText, leftColumn, currentY, { width: addressWidth });
      currentY += addressHeight + lineSpacing;

      doc.text(`Phone: ${company.phone || "000-000-0000"}`, leftColumn, currentY);
      currentY += doc.heightOfString("A", { width: addressWidth }) + lineSpacing;

      doc.text(`Email: ${company.email || "contact@company.com"}`, leftColumn, currentY);
      currentY += doc.heightOfString("A", { width: addressWidth }) + lineSpacing;

      const lineY = Math.max(headerY + logoHeight, currentY) + 10;
      doc.moveTo(leftColumn, lineY).lineTo(pageWidth, lineY).stroke();

      const spaceAfterHeader = 20;

      return lineY + spaceAfterHeader;
    }

    // ===== FOOTER LINE FUNCTION - FOR EVERY PAGE =====
    const addFooterLine = () => {
      const footerY = 750;
      doc.moveTo(leftColumn, footerY).lineTo(pageWidth, footerY).stroke();
    };

    // ===== FINAL FOOTER FUNCTION - FOR LAST PAGE ONLY =====
    const addFinalFooter = () => {
      const footerY = 750;
      doc.moveTo(leftColumn, footerY).lineTo(pageWidth, footerY).stroke();
      doc.fontSize(14).font('Helvetica')
         .text("Thank You For Your Business!", (leftColumn + pageWidth) / 2, footerY + 15, { align: "right" });
    };

    // ===== UPDATED TABLE HEADER FUNCTION =====
    const addTableHeader = (yPosition) => {
      doc.rect(leftColumn, yPosition, pageWidth - leftColumn, 20).fill("#f0f0f0");
      doc.fontSize(8).font('Helvetica-Bold').fillColor("#000")
         .text("DESCRIPTION", leftColumn + 10, yPosition + 5)
         .text("REMARKS", leftColumn + 120, yPosition + 5)
         .text("UNIT PRICE", leftColumn + 200, yPosition + 5) // NEW COLUMN
         .text("QTY", leftColumn + 260, yPosition + 5) // NEW COLUMN
         .text(`AMOUNT (${currencySymbol})`, pageWidth - 80, yPosition + 5, { align: "right" });
    };

    // ===== TRACK PAGES FOR HEADER/FOOTER =====
    let pageNumber = 1;
   
    // Add header to first page and get the starting Y position
    currentY = addHeader(pageNumber);
   
    // Listen for page additions to add headers to subsequent pages
    doc.on('pageAdded', () => {
      pageNumber++;
      currentY = addHeader(pageNumber);
      addFooterLine();
    });

    // Add footer line to first page
    addFooterLine();

    // ===== BILL TO SECTION - LEFT SIDE =====
    const billToStartY = currentY;
    doc.fontSize(16).font('Helvetica-Bold').text("BILL TO", leftColumn, currentY);
    currentY += 25;

    const customerCompany = customer.company;

    if (customerCompany) {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(customerCompany, leftColumn, currentY);
      currentY += 20;
    }

    const addressLines = customer.address.split('\n').filter(line => line.trim() !== '');
    addressLines.forEach((line, index) => {
      doc.fontSize(10).font('Helvetica')
         .text(line.trim(), leftColumn, currentY);
      currentY += 15;
    });

    if (customer.phone) {
      doc.text(`Phone: ${customer.phone}`, leftColumn, currentY);
      currentY += 15;
    }

    if (customer.email) {
      doc.text(`Email: ${customer.email}`, leftColumn, currentY);
      currentY += 15;
    }

    currentY = billToStartY;

    // ===== INVOICE DETAILS SECTION - RIGHT SIDE =====
    doc.fontSize(16).font('Helvetica-Bold').text("INVOICE", rightColumn, currentY);
    currentY += 25;

    // Invoice details in two columns
    const detailLabels = ["DATE                 :", "INVOICE NO     :", "CUSTOMER ID :", "DUE DATE        :"];
    const invDate = new Date(savedInvoice.date).toISOString().split('T')[0];
    const due = savedInvoice.dueDate ? new Date(savedInvoice.dueDate).toISOString().split('T')[0] : 'N/A';
    const detailValues = [
      invDate,
      savedInvoice.invoiceNumber,
      savedInvoice.customerId.customerId,
      due
    ];

    detailLabels.forEach((label, index) => {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(label, rightColumn, currentY);
      doc.font('Helvetica')
         .text(detailValues[index], rightColumn + 80, currentY);
      currentY += 15;
    });

    // ===== ITEMS TABLE =====
    const leftColumnBottom = billToStartY + 120;
    currentY = Math.max(currentY, leftColumnBottom) + 10;

    // Add table header
    addTableHeader(currentY);
    currentY += 25;

    // Table rows with new columns
    items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > 650) {
        doc.addPage();
        currentY = 150;
        addTableHeader(currentY);
        currentY += 25;
      }

      const remarks = item.remarks || "";
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const amount = unitPrice * quantity;
      const formattedUnitPrice = formatCurrencyAmount(unitPrice, currency);
      const formattedAmount = formatCurrencyAmount(amount, currency);

      // Calculate heights for all columns
      const descriptionHeight = doc.heightOfString(item.description, {
        width: 100,
        align: 'left'
      });
     
      const remarksHeight = doc.heightOfString(remarks, {
        width: 70,
        align: 'left'
      });

      const rowHeight = Math.max(descriptionHeight, remarksHeight, 20);

      // Draw background for entire row
      if (index % 2 === 0) {
        doc.rect(leftColumn, currentY - 5, pageWidth - leftColumn, rowHeight + 10)
           .fillOpacity(0.1).fill("#eeeeee").fillOpacity(1).fillColor('black');
      }

      // Draw description
      doc.fontSize(8).font('Helvetica')
         .text(item.description, leftColumn + 10, currentY, {
           width: 100,
           align: 'left'
         });

      // Draw remarks
      doc.text(remarks, leftColumn + 120, currentY, {
        width: 70,
        align: 'left'
      });

      // Draw unit price
      doc.text(`${currencySymbol}${formattedUnitPrice}`, leftColumn + 200, currentY, {
        width: 50,
        align: 'right'
      });

      // Draw quantity
      doc.text(quantity.toString(), leftColumn + 260, currentY, {
        width: 30,
        align: 'center'
      });

      // Draw amount
      doc.text(`${currencySymbol}${formattedAmount}`, pageWidth - 100, currentY, {
        align: "right"
      });
     
      currentY += rowHeight + 10;
    });

    // ===== TOTALS SECTION =====
    currentY += 10;
    const formattedSubtotal = formatCurrencyAmount(subtotal, currency);
    const formattedTaxAmount = formatCurrencyAmount(taxAmount, currency);
    const formattedGrandTotal = formatCurrencyAmount(grandTotal, currency);
   
    // Subtotal
    doc.fontSize(10).font('Helvetica')
       .text("Subtotal:", pageWidth - 150, currentY, { align: "left" })
       .text(`${currencySymbol}${formattedSubtotal}`, pageWidth - 100, currentY, { align: "right" });
    currentY += 20;
   
    // Tax
    if (taxPercent > 0) {
      doc.text(`Tax (${taxPercent}%):`, pageWidth - 150, currentY, { align: "left" })
         .text(`${currencySymbol}${formattedTaxAmount}`, pageWidth - 100, currentY, { align: "right" });
      currentY += 20;
    }
   
    // Total
    doc.moveTo(pageWidth - 200, currentY).lineTo(pageWidth, currentY).stroke();
    currentY += 15;
   
    doc.fontSize(12).font('Helvetica-Bold')
       .text("TOTAL:", pageWidth - 150, currentY, { align: "left" })
       .text(`${currencySymbol}${formattedGrandTotal}`, pageWidth - 100, currentY, { align: "right" });
    currentY += 20;

    doc.moveTo(pageWidth - 200, currentY).lineTo(pageWidth, currentY).stroke();
    currentY += 20;

    // ===== AMOUNT IN WORDS =====
    const wordsHeight = doc.heightOfString(amountWords + "/- .", { width: pageWidth - leftColumn });
   
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`Amount in Words: ${amountWords}`, leftColumn, currentY, {
         width: pageWidth - leftColumn
       });
    currentY += wordsHeight + 20;

    // ===== OTHER COMMENTS SECTION =====
    if (notes && notes.trim() !== "") {
      doc.fontSize(11).font('Helvetica-Bold').text("OTHER COMMENTS", leftColumn, currentY);
      currentY += 15;

      const sentences = notes.split('.').map(s => s.trim()).filter(s => s.length > 0);
      doc.fontSize(10).font('Helvetica');
      sentences.forEach(sentence => {
        const bulletText = `• ${sentence}.`;
        const textHeight = doc.heightOfString(bulletText, { width: 500 });
        doc.text(bulletText, leftColumn + 10, currentY, { width: 500 });
        currentY += textHeight + 5;
      });
    }

    // Terms & Conditions section
    doc.fontSize(10).font('Helvetica-Bold').text("Terms & Conditions", leftColumn, currentY);
    currentY += 15;

    const defaultComments = [
      "Total payment due in 30 days",
      "Please include the invoice number on your check"
    ];

    // Add default comments with bullet points
    defaultComments.forEach((comment, index) => {
      doc.fontSize(10).font('Helvetica')
         .text(`${'•'} ${comment}`, leftColumn + 10, currentY);
      currentY += 15;
    });

    // ===== SIGNATURE SECTION =====
    const signatureY = 680;
    const signatureX = pageWidth - 125;
    const signatureWidth = 100;
    const signatureHeight = 50;
    // Add signature from Cloudinary if available
    if (signatureBuffer) {
      try {
        doc.image(signatureBuffer, signatureX - 20, signatureY - 55, {
          width: signatureWidth,
          height: signatureHeight
        });
        console.log("✅ Signature added to PDF");
      } catch (signatureError) {
        console.error("❌ Error adding signature to PDF:", signatureError.message);
      }
    }

    doc.fontSize(10).font('Helvetica')
    .text('For Zynith IT Solutions', signatureX - 40, signatureY + 5, {
      width: 150,
      align: 'center'
    });

    // ===== ADD FINAL FOOTER TO LAST PAGE =====
    addFinalFooter();

    doc.end();

  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Error generating invoice", error: error.message });
  }
};

// Update the downloadInvoice function with new fields
export const downloadInvoice = async (req, res) => {
  try {
    console.log('📥 Download invoice request received for ID:', req.params.id);
    const { id } = req.params;
   
    if (!id) {
      return res.status(400).json({ message: "Invoice ID is required" });
    }

    // Fetch invoice with customer details
    const invoice = await Invoice.findById(id).populate("customerId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Fetch or create company info
    let company = await Company.findOne();
   if (!company) {
      console.log('❌ Company information not found for download');
      return res.status(404).json({ 
        message: "Company information not found. Please set up company details first in Company Settings." 
      });
    }
     if (!company.companyName || !company.address) {
      console.log('❌ Company information incomplete for download');
      return res.status(400).json({ 
        message: "Company information is incomplete. Please complete company details in Company Settings." 
      });
    }

    let logoBuffer = null;
    let signatureBuffer = null;
 
    try {
      // Load logo from Cloudinary
      if (company.logo?.url) {
        const logoResponse = await axios({
          method: 'GET',
          url: company.logo.url,
          responseType: 'arraybuffer',
          timeout: 10000
        });
        logoBuffer = Buffer.from(logoResponse.data);
        console.log("✅ Logo loaded from Cloudinary for download");
      }
    } catch (logoError) {
      console.error("❌ Error loading logo from Cloudinary:", logoError.message);
    }
 
    try {
      // Load signature from Cloudinary
      if (company.signature?.url) {
        const signatureResponse = await axios({
          method: 'GET',
          url: company.signature.url,
          responseType: 'arraybuffer',
          timeout: 10000
        });
        signatureBuffer = Buffer.from(signatureResponse.data);
        console.log("✅ Signature loaded from Cloudinary for download");
      }
    } catch (signatureError) {
      console.error("❌ Error loading signature from Cloudinary:", signatureError.message);
    }


    // PDF setup - stream directly to response
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true
    });
   
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
    res.setHeader('X-Invoice-Number', invoice.invoiceNumber);
   
    doc.pipe(res);

    // ===== DYNAMIC POSITIONING VARIABLES =====
    let currentY = 30;
    const leftColumn = 50;
    const rightColumn = 350;
    const pageWidth = 550;
    const columnWidth = 200;

    // Get currency symbol and name
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const amountWords = getAmountInWords(invoice.totalAmount, invoice.currency);

    // ===== LOGO SECTION =====
    const addHeader = (pageNumber) => {
      const headerY = 30;
     
      // ===== LOGO SECTION =====
      const logoWidth = 140;
      const logoHeight = 100;
      const logoX = pageWidth - logoWidth + 15;
     
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, logoX, 20, {
            width: logoWidth,
            height: logoHeight
          });
          console.log("✅ Company logo added to PDF");
        } catch (logoError) {
          console.error("❌ Error adding logo to PDF:", logoError.message);
        }
      }


      // ===== COMPANY INFO =====
      doc.fontSize(20).font('Helvetica-Bold')
         .text(company.companyName, leftColumn, headerY);

      doc.fontSize(10).font('Helvetica');
      const lineSpacing = 2;

      let currentY = headerY + 30;

      const addressText = company.address || "123 Main Street, City, ZIP";
      const addressWidth = pageWidth / 2;
      const addressHeight = doc.heightOfString(addressText, {
        width: addressWidth,
      });

      doc.text(addressText, leftColumn, currentY, { width: addressWidth });
      currentY += addressHeight + lineSpacing;

      doc.text(`Phone: ${company.phone || "000-000-0000"}`, leftColumn, currentY);
      currentY += doc.heightOfString("A", { width: addressWidth }) + lineSpacing;

      doc.text(`Email: ${company.email || "contact@company.com"}`, leftColumn, currentY);
      currentY += doc.heightOfString("A", { width: addressWidth }) + lineSpacing;

      const lineY = Math.max(headerY + logoHeight, currentY) + 10;
      doc.moveTo(leftColumn, lineY).lineTo(pageWidth, lineY).stroke();

      const spaceAfterHeader = 20;

      return lineY + spaceAfterHeader;
    }

    // ===== FOOTER LINE FUNCTION - FOR EVERY PAGE =====
    const addFooterLine = () => {
      const footerY = 750;
      doc.moveTo(leftColumn, footerY).lineTo(pageWidth, footerY).stroke();
    };

    // ===== FINAL FOOTER FUNCTION - FOR LAST PAGE ONLY =====
    const addFinalFooter = () => {
      const footerY = 750;
      doc.moveTo(leftColumn, footerY).lineTo(pageWidth, footerY).stroke();
      doc.fontSize(14).font('Helvetica')
         .text("Thank You For Your Business!", (leftColumn + pageWidth) / 2, footerY + 15, { align: "right" });
    };

    // ===== UPDATED TABLE HEADER FUNCTION =====
    const addTableHeader = (yPosition) => {
      doc.rect(leftColumn, yPosition, pageWidth - leftColumn, 20).fill("#f0f0f0");
      doc.fontSize(8).font('Helvetica-Bold').fillColor("#000")
         .text("DESCRIPTION", leftColumn + 10, yPosition + 5)
         .text("REMARKS", leftColumn + 120, yPosition + 5)
         .text("UNIT PRICE", leftColumn + 200, yPosition + 5) // NEW COLUMN
         .text("QTY", leftColumn + 260, yPosition + 5) // NEW COLUMN
         .text(`AMOUNT (${currencySymbol})`, pageWidth - 80, yPosition + 5, { align: "right" });
    };

    // ===== TRACK PAGES FOR HEADER/FOOTER =====
    let pageNumber = 1;
   
    // Add header to first page and get the starting Y position
    currentY = addHeader(pageNumber);
   
    // Listen for page additions to add headers to subsequent pages
    doc.on('pageAdded', () => {
      pageNumber++;
      currentY = addHeader(pageNumber);
      addFooterLine();
    });

    // Add footer line to first page
    addFooterLine();

    // ===== BILL TO SECTION - LEFT SIDE =====
    const billToStartY = currentY;
    doc.fontSize(16).font('Helvetica-Bold').text("BILL TO", leftColumn, currentY);
    currentY += 25;

    const customerCompany = invoice.customerId.company;

    if (customerCompany) {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(customerCompany, leftColumn, currentY);
      currentY += 20;
    }

    const addressLines = invoice.customerId.address.split('\n').filter(line => line.trim() !== '');
    addressLines.forEach((line, index) => {
      doc.fontSize(10).font('Helvetica')
         .text(line.trim(), leftColumn, currentY);
      currentY += 15;
    });

    if (invoice.customerId.phone) {
      doc.text(`Phone: ${invoice.customerId.phone}`, leftColumn, currentY);
      currentY += 15;
    }

    if (invoice.customerId.email) {
      doc.text(`Email: ${invoice.customerId.email}`, leftColumn, currentY);
      currentY += 15;
    }

    currentY = billToStartY;

    // ===== INVOICE DETAILS SECTION - RIGHT SIDE =====
    doc.fontSize(16).font('Helvetica-Bold').text("INVOICE", rightColumn, currentY);
    currentY += 25;

    // Invoice details in two columns
    const detailLabels = ["DATE                 :", "INVOICE NO     :", "CUSTOMER ID :", "DUE DATE        :"];
    const invDate = new Date(invoice.date).toISOString().split('T')[0];
    const due = invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : 'N/A';
    const detailValues = [
      invDate,
      invoice.invoiceNumber,
      invoice.customerId.customerId,
      due
    ];

    detailLabels.forEach((label, index) => {
      doc.fontSize(10).font('Helvetica-Bold')
         .text(label, rightColumn, currentY);
      doc.font('Helvetica')
         .text(detailValues[index], rightColumn + 80, currentY);
      currentY += 15;
    });

    // ===== ITEMS TABLE =====
    const leftColumnBottom = billToStartY + 120;
    currentY = Math.max(currentY, leftColumnBottom) + 10;

    // Add table header
    addTableHeader(currentY);
    currentY += 25;

    // Table rows with new columns
    invoice.items.forEach((item, index) => {
      // Check if we need a new page
      if (currentY > 650) {
        doc.addPage();
        currentY = 150;
        addTableHeader(currentY);
        currentY += 25;
      }

      const remarks = item.remarks || "";
      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity || 0;
      const amount = item.amount || 0;
      const formattedUnitPrice = formatCurrencyAmount(unitPrice, invoice.currency);
      const formattedAmount = formatCurrencyAmount(amount, invoice.currency);

      // Calculate heights for all columns
      const descriptionHeight = doc.heightOfString(item.description, {
        width: 100,
        align: 'left'
      });
     
      const remarksHeight = doc.heightOfString(remarks, {
        width: 70,
        align: 'left'
      });

      const rowHeight = Math.max(descriptionHeight, remarksHeight, 20);

      // Draw background for entire row
      if (index % 2 === 0) {
        doc.rect(leftColumn, currentY - 5, pageWidth - leftColumn, rowHeight + 10)
           .fillOpacity(0.1).fill("#eeeeee").fillOpacity(1).fillColor('black');
      }

      // Draw description
      doc.fontSize(8).font('Helvetica')
         .text(item.description, leftColumn + 10, currentY, {
           width: 100,
           align: 'left'
         });

      // Draw remarks
      doc.text(remarks, leftColumn + 120, currentY, {
        width: 70,
        align: 'left'
      });

      // Draw unit price
      doc.text(`${currencySymbol}${formattedUnitPrice}`, leftColumn + 200, currentY, {
        width: 50,
        align: 'right'
      });

      // Draw quantity
      doc.text(quantity.toString(), leftColumn + 260, currentY, {
        width: 30,
        align: 'center'
      });

      // Draw amount
      doc.text(`${currencySymbol}${formattedAmount}`, pageWidth - 100, currentY, {
        align: "right"
      });
     
      currentY += rowHeight + 10;
    });

    // ===== TOTALS SECTION =====
    currentY += 10;
    const formattedSubtotal = formatCurrencyAmount(invoice.subtotal, invoice.currency);
    const formattedTaxAmount = formatCurrencyAmount(invoice.taxAmount, invoice.currency);
    const formattedGrandTotal = formatCurrencyAmount(invoice.totalAmount, invoice.currency);
   
    // Subtotal
    doc.fontSize(10).font('Helvetica')
       .text("Subtotal:", pageWidth - 150, currentY, { align: "left" })
       .text(`${currencySymbol}${formattedSubtotal}`, pageWidth - 100, currentY, { align: "right" });
    currentY += 20;
   
    // Tax
    if (invoice.taxPercent > 0) {
      doc.text(`Tax (${invoice.taxPercent}%):`, pageWidth - 150, currentY, { align: "left" })
         .text(`${currencySymbol}${formattedTaxAmount}`, pageWidth - 100, currentY, { align: "right" });
      currentY += 20;
    }
   
    // Total
    doc.moveTo(pageWidth - 200, currentY).lineTo(pageWidth, currentY).stroke();
    currentY += 15;
   
    doc.fontSize(12).font('Helvetica-Bold')
       .text("TOTAL:", pageWidth - 150, currentY, { align: "left" })
       .text(`${currencySymbol}${formattedGrandTotal}`, pageWidth - 100, currentY, { align: "right" });
    currentY += 20;

    doc.moveTo(pageWidth - 200, currentY).lineTo(pageWidth, currentY).stroke();
    currentY += 20;

    // ===== AMOUNT IN WORDS =====
    const wordsHeight = doc.heightOfString(amountWords + "/- .", { width: pageWidth - leftColumn });
   
    doc.fontSize(10).font('Helvetica-Bold')
       .text(`Amount in Words: ${amountWords}`, leftColumn, currentY, {
         width: pageWidth - leftColumn
       });
    currentY += wordsHeight + 20;

    // ===== OTHER COMMENTS SECTION =====
    if (invoice.notes && invoice.notes.trim() !== "") {
      doc.fontSize(11).font('Helvetica-Bold').text("OTHER COMMENTS", leftColumn, currentY);
      currentY += 15;

      const sentences = invoice.notes.split('.').map(s => s.trim()).filter(s => s.length > 0);
      doc.fontSize(10).font('Helvetica');
      sentences.forEach(sentence => {
        const bulletText = `• ${sentence}.`;
        const textHeight = doc.heightOfString(bulletText, { width: 500 });
        doc.text(bulletText, leftColumn + 10, currentY, { width: 500 });
        currentY += textHeight + 5;
      });
    }

    // Terms & Conditions section
    doc.fontSize(10).font('Helvetica-Bold').text("Terms & Conditions", leftColumn, currentY);
    currentY += 15;

    const defaultComments = [
      "Total payment due in 30 days",
      "Please include the invoice number on your check"
    ];

    // Add default comments with bullet points
    defaultComments.forEach((comment, index) => {
      doc.fontSize(10).font('Helvetica')
         .text(`${'•'} ${comment}`, leftColumn + 10, currentY);
      currentY += 15;
    });

    // ===== SIGNATURE SECTION =====
    const signatureY = 680;
    const signatureX = pageWidth - 125;
    const logoWidth = 100;
    const logoHeight = 50;
    try {
        const slogoPath = join(__dirname, 'Sign.png');
        if (fs.existsSync(slogoPath)) {
          doc.image(slogoPath, signatureX-20,signatureY-55, {
            width: logoWidth,
            height: logoHeight
          });
        }
      } catch (logoError) {
        console.error("❌ Error loading logo:", logoError);
      }
   
    doc.fontSize(10).font('Helvetica')
       .text('For Zynith IT Solutions', signatureX - 40, signatureY + 5, {
         width: 150,
         align: 'center'
       });

    // ===== ADD FINAL FOOTER TO LAST PAGE =====
    addFinalFooter();

    doc.end();

    console.log('✅ PDF generated successfully');

  } catch (error) {
    console.error("❌ Error downloading invoice:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      message: "Error downloading invoice",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all invoices
export const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("customerId", "name email phone")
      .sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ message: "Error fetching invoices", error: error.message });
  }
};

// Get active invoices (non-disabled)
export const getActiveInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ isDisabled: false })
      .populate("customerId", "name email phone")
      .sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching active invoices:", error);
    res.status(500).json({ message: "Error fetching invoices", error: error.message });
  }
};

// Get disabled invoices
export const getDisabledInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ isDisabled: true })
      .populate("customerId", "name email phone")
      .sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    console.error("Error fetching disabled invoices:", error);
    res.status(500).json({ message: "Error fetching disabled invoices", error: error.message });
  }
};

// Get invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customerId");
   
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ message: "Error fetching invoice", error: error.message });
  }
};
// Disable invoice (soft delete) - FIXED WITH UPPERCASE STATUS CHECK
export const disableInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔄 Attempting to disable invoice:', id);

    // ✅ CHECK IF INVOICE EXISTS
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      console.log('❌ Invoice not found:', id);
      return res.status(404).json({ 
        message: "Invoice not found" 
      });
    }

    console.log('📋 Invoice found:', {
      id: existingInvoice._id,
      invoiceNumber: existingInvoice.invoiceNumber,
      status: existingInvoice.status,
      isDisabled: existingInvoice.isDisabled
    });

    // ✅ CHECK IF INVOICE IS ALREADY PAID - PREVENT DISABLING (USING UPPERCASE)
    if (existingInvoice.status === "paid") {
      console.log('❌ Cannot disable paid invoice:', existingInvoice.invoiceNumber);
      return res.status(400).json({ 
        message: "Cannot disable invoice that has been paid. Paid invoices cannot be disabled." 
      });
    }

    // ✅ CHECK IF INVOICE IS ALREADY DISABLED
    if (existingInvoice.isDisabled) {
      console.log('ℹ️ Invoice already disabled:', existingInvoice.invoiceNumber);
      return res.status(400).json({ 
        message: "Invoice is already disabled." 
      });
    }

    // Disable the invoice
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      {
        isDisabled: true,
        deleted: true,
        disabledAt: new Date()
      },
      { new: true }
    ).populate("customerId");

    console.log('✅ Invoice disabled successfully:', invoice.invoiceNumber);

    res.json({
      message: "Invoice moved to disabled invoices successfully",
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        isDisabled: invoice.isDisabled
      }
    });

  } catch (error) {
    console.error("❌ Error disabling invoice:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: "Invalid invoice ID format" 
      });
    }
    
    res.status(500).json({ 
      message: "Error disabling invoice", 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Permanently delete invoice
export const permanentDeleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
   
    const invoice = await Invoice.findOne({ _id: id, isDisabled: true });
    if (!invoice) {
      return res.status(404).json({ message: "Disabled invoice not found" });
    }

    // ✅ CHECK IF INVOICE IS PAID - PREVENT DELETION
    if (invoice.status === "paid") {
      return res.status(400).json({ 
        message: "Cannot delete invoice that has been paid. Paid invoices cannot be permanently deleted." 
      });
    }

    // Delete associated payment proof file if exists
    if (invoice.paymentDetails?.proofFile?.filePath) {
      try {
        if (fs.existsSync(invoice.paymentDetails.proofFile.filePath)) {
          fs.unlinkSync(invoice.paymentDetails.proofFile.filePath);
        }
      } catch (fileError) {
        console.error("Error deleting payment proof file:", fileError);
      }
    }

    await Invoice.findByIdAndDelete(id);
   
    res.json({ message: "Invoice permanently deleted successfully" });
  } catch (error) {
    console.error("Error permanently deleting invoice:", error);
    res.status(500).json({ message: "Error deleting invoice", error: error.message });
  }
};

// Enhanced function to handle payment verification with file upload and storage
export const verifyPayment = async (req, res) => {
  try {
    const { invoiceId, transactionNumber } = req.body;
    const transactionProof = req.file; // Get uploaded file
   
    // Validate required fields
    if (!invoiceId || !transactionNumber) {
      return res.status(400).json({ message: "Invoice ID and transaction number are required" });
    }

    if (!transactionProof) {
      return res.status(400).json({ message: "Transaction proof file is required" });
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
   
    if (!allowedMimeTypes.includes(transactionProof.mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Supported formats: PDF, JPG, PNG, DOC"
      });
    }

    // Validate file size (10MB max)
    if (transactionProof.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        message: "File size too large. Maximum size is 10MB."
      });
    }

    // Generate unique filename
    const fileExtension = path.extname(transactionProof.originalname);
    const uniqueFileName = `payment-proof-${invoiceId}-${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, uniqueFileName);

    // Save file to server
    fs.writeFileSync(filePath, transactionProof.buffer);

    // Construct file URL
    const fileUrl = `/api/billing/payment-proofs/${uniqueFileName}`;

    // Find and update invoice status with file details
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        status: "paid",
        $set: {
          "paymentDetails.transactionNumber": transactionNumber,
          "paymentDetails.verifiedAt": new Date(),
          "paymentDetails.proofFile": {
            originalName: transactionProof.originalname,
            mimeType: transactionProof.mimetype,
            size: transactionProof.size,
            uploadedAt: new Date(),
            fileName: uniqueFileName,
            filePath: filePath,
            fileUrl: fileUrl
          }
        }
      },
      { new: true, runValidators: true }
    ).populate("customerId");

    if (!updatedInvoice) {
      // Clean up uploaded file if invoice not found
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: "Invoice not found" });
    }

    // ✅ CREATE TRANSACTION ENTRY AUTOMATICALLY
    try {
      await createTransactionForPaidInvoice(updatedInvoice, transactionNumber);
      console.log(`✅ Transaction history created for invoice: ${updatedInvoice.invoiceNumber}`);
    } catch (transactionError) {
      console.error("⚠️ Invoice paid but failed to create transaction:", transactionError);
      // Don't fail the whole request if transaction creation fails
    }

    res.json({
      message: "Payment verified successfully",
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment", error: error.message });
  }
};
// Restore disabled invoice
export const restoreInvoice = async (req, res) => {
  try {
    const { id } = req.params;
   
    const invoice = await Invoice.findByIdAndUpdate(
      id,
      {
        isDisabled: false,
        deleted: false
      },
      { new: true }
    ).populate("customerId");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({
      message: "Invoice restored successfully",
      invoice
    });
  } catch (error) {
    console.error("Error restoring invoice:", error);
    res.status(500).json({ message: "Error restoring invoice", error: error.message });
  }
};