// import Transaction from '../models/Transaction.js';
// import ExcelJS from 'exceljs';
 
// //download transaction as excel
// export const downloadExcel = async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
   
//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         message: 'Start date and end date are required'
//       });
//     }
 
//     const filter = {
//       createdBy: req.user.id,
//       date: {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       }
//     };
 
//     // Get transactions within date range
//     const transactions = await Transaction.find(filter)
//       .sort({ date: -1 })
//       .select('-attachment.data');
 
//     if (transactions.length === 0) {
//       return res.status(404).json({
//         message: 'No transactions found for the selected date range'
//       });
//     }
 
//     // Create workbook and worksheet
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Transactions Report');
 
//     // Set default column widths
//     worksheet.columns = [
//       { width: 12 },  // A: Date
//       { width: 25 },  // B: Description
//       { width: 12 },  // C: Type
//       { width: 18 },  // D: Category
//       { width: 15 },  // E: Amount
//       { width: 30 },  // F: Remarks
//       { width: 12 },  // G: Receipt
//       { width: 20 }   // H: Created At
//     ];
 
//     // Title Row
//     worksheet.mergeCells('A1:H1');
//     const titleCell = worksheet.getCell('A1');
//     titleCell.value = 'COMPREHENSIVE FINANCIAL PERFORMANCE OVERVIEW';
//     titleCell.font = {
//       bold: true,
//       size: 16,
//       color: { argb: 'FFFFFFFF' }
//     };
//     titleCell.fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF2E86AB' }
//     };
//     titleCell.alignment = {
//       horizontal: 'center',
//       vertical: 'middle'
//     };
//     titleCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
 
//     // Date Range Row
//     worksheet.mergeCells('A2:H2');
//     const dateRangeCell = worksheet.getCell('A2');
//     dateRangeCell.value = `Date Range: ${formatDateDDMMYYYY(startDate)} to ${formatDateDDMMYYYY(endDate)}`;
 
//     // Helper function
//     function formatDateDDMMYYYY(dateString) {
//       const [year, month, day] = dateString.split('-');
//       return `${day}-${month}-${year}`;
//     }
//     dateRangeCell.font = {
//       bold: true,
//       size: 12,
//       color: { argb: 'FF333333' }
//     };
//     dateRangeCell.fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FFE9ECEF' }
//     };
//     dateRangeCell.alignment = {
//       horizontal: 'center',
//       vertical: 'middle'
//     };
//     dateRangeCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
 
//     // Empty row for spacing
//     worksheet.getRow(3).height = 5;
 
//     // Column Headers Row
//     const headerRow = worksheet.getRow(4);
//     // const headerrowrange = worksheet.getCell('A4:H4')
//     headerRow.values = [
//       'DATE',
//       'DESCRIPTION',
//       'TYPE',
//       'CATEGORY',
//       'AMOUNT',
//       'REMARKS',
//       'RECEIPT',
//       'CREATED AT'
//     ];
   
//     // Style header row
//     headerRow.font = {
//       bold: true,
//       size: 11,
//       color: { argb: 'FFFFFFFF' }
//     };
 
//     headerRow.eachCell((cell) => {
//   cell.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FF495057' }
//   };
//   cell.border = {
//     top: { style: 'thin' },
//     left: { style: 'thin' },
//     bottom: { style: 'thin' },
//     right: { style: 'thin' }
//   };
//   });
   
//     // Set each header cell individually for proper styling
//     headerRow.eachCell((cell, colNumber) => {
//       cell.alignment = {
//         horizontal: 'center',
//         vertical: 'middle',
//         wrapText: true
//       };
//     });
 
//     // Add transactions data
//     let currentRow = 5;
   
//     transactions.forEach((transaction, index) => {
//       const row = worksheet.getRow(currentRow);
     
//       // FIX: Properly check if attachment exists and has data
//       const hasReceipt =
//                         transaction.attachment.filename;
//                         // transaction.attachment.filename &&
//                         // transaction.attachment.data;
     
//       const receiptStatus = hasReceipt ? 'Available' : 'Not Available';
     
//       row.values = [
//         transaction.date.toISOString().split('T')[0],
//         transaction.description,
//         transaction.type,
//         transaction.category,
//         transaction.amount,
//         transaction.remarks || 'N/A',
//         receiptStatus,
//         transaction.createdAt.toLocaleString()
//       ];
 
//       // Style the row
//       row.font = {
//         size: 10
//       };
     
//       // Alternate row colors for better readability
//       if (index % 2 === 0) {
//         row.fill = {
//           type: 'pattern',
//           pattern: 'solid',
//           fgColor: { argb: 'FFF8F9FA' }
//         };
//       }
 
//       // Add borders to all cells
//       row.eachCell((cell, colNumber) => {
//         cell.border = {
//           top: { style: 'thin' },
//           left: { style: 'thin' },
//           bottom: { style: 'thin' },
//           right: { style: 'thin' }
//         };
       
//         // Different alignment for different columns
//         if (colNumber === 5) { // Amount column
//           cell.alignment = {
//             horizontal: 'right',
//             vertical: 'middle'
//           };
//           cell.numFmt = '#,##0.00';
         
//           // Color code amounts based on type
//           if (transaction.type === 'Income') {
//             cell.font = {
//               color: { argb: 'FF008000' },
//               bold: true
//             };
//           } else {
//             cell.font = {
//               color: { argb: 'FFFF0000' },
//               bold: true
//             };
//           }
//         } else if (colNumber === 7) { // Receipt column
//           cell.alignment = {
//             horizontal: 'center',
//             vertical: 'middle'
//           };
         
//           // Color code receipt status
//           if (hasReceipt) {
//             cell.font = {
//               color: { argb: 'FF008000' },
//               bold: true
//             };
//           } else {
//             cell.font = {
//               color: { argb: 'FF6C757D' } // Gray for not available
//             };
//           }
//         } else if (colNumber === 1 || colNumber === 8) { // Date columns
//           cell.alignment = {
//             horizontal: 'center',
//             vertical: 'middle'
//           };
//         } else {
//           cell.alignment = {
//             horizontal: 'left',
//             vertical: 'middle',
//             wrapText: true
//           };
//         }
//       });
 
//       row.height = 20;
//       currentRow++;
//     });
 
//     // Add empty row before summary
//     worksheet.getRow(currentRow).height = 10;
//     currentRow++;
 
//     // SUMMARY SECTION
//     // Calculate totals
//     const incomeTotal = transactions
//       .filter(t => t.type === 'Income')
//       .reduce((sum, t) => sum + t.amount, 0);
   
//     const expenseTotal = transactions
//       .filter(t => t.type === 'Expense')
//       .reduce((sum, t) => sum + t.amount, 0);
   
//     const netTotal = incomeTotal - expenseTotal;
   
//     // Count transactions with receipts (FIXED)
//     const transactionsWithReceipts = transactions.filter(t =>
//       t.attachment && t.attachment.filename && t.attachment.data
//     ).length;
 
//     // Summary Title
//     worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
//     const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
//     summaryTitleCell.value = 'FINANCIAL SUMMARY';
//     summaryTitleCell.font = {
//       bold: true,
//       size: 14,
//       color: { argb: 'FFFFFFFF' }
//     };
//     summaryTitleCell.fill = {
//       type: 'pattern',
//       pattern: 'solid',
//       fgColor: { argb: 'FF2E86AB' }
//     };
//     summaryTitleCell.alignment = {
//       horizontal: 'center',
//       vertical: 'middle'
//     };
//     summaryTitleCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
//     currentRow++;
 
//     // Total Income
//     worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
//     const incomeLabelCell = worksheet.getCell(`A${currentRow}`);
//     incomeLabelCell.value = 'Total Income';
//     incomeLabelCell.font = { bold: true };
//     incomeLabelCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
   
//     worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
//     const incomeValueCell = worksheet.getCell(`E${currentRow}`);
//     incomeValueCell.value = incomeTotal;
//     incomeValueCell.numFmt = '#,##0.00';
//     incomeValueCell.font = {
//       bold: true,
//       color: { argb: 'FF008000' }
//     };
//     incomeValueCell.alignment = { horizontal: 'right' };
//     incomeValueCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
//     currentRow++;
 
//     // Total Expenses
//     worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
//     const expenseLabelCell = worksheet.getCell(`A${currentRow}`);
//     expenseLabelCell.value = 'Total Expenses';
//     expenseLabelCell.font = { bold: true };
//     expenseLabelCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
   
//     worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
//     const expenseValueCell = worksheet.getCell(`E${currentRow}`);
//     expenseValueCell.value = expenseTotal;
//     expenseValueCell.numFmt = '#,##0.00';
//     expenseValueCell.font = {
//       bold: true,
//       color: { argb: 'FFFF0000' }
//     };
//     expenseValueCell.alignment = { horizontal: 'right' };
//     expenseValueCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
//     currentRow++;
 
//     // Net Amount
//     worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
//     const netLabelCell = worksheet.getCell(`A${currentRow}`);
//     netLabelCell.value = 'Net Amount';
//     netLabelCell.font = { bold: true };
//     netLabelCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
   
//     worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
//     const netValueCell = worksheet.getCell(`E${currentRow}`);
//     netValueCell.value = netTotal;
//     netValueCell.numFmt = '#,##0.00';
//     netValueCell.font = {
//       bold: true,
//       color: { argb: netTotal >= 0 ? 'FF008000' : 'FFFF0000' }
//     };
//     netValueCell.alignment = { horizontal: 'right' };
//     netValueCell.border = {
//       top: { style: 'thin' },
//       left: { style: 'thin' },
//       bottom: { style: 'thin' },
//       right: { style: 'thin' }
//     };
//     currentRow++;
 
//     // Set response headers for file download
//     const fileName = `transactions-report-${startDate}-to-${endDate}.xlsx`;
   
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
 
//     // Write workbook to response
//     await workbook.xlsx.write(res);
//     res.end();
 
//   } catch (error) {
//     console.error('Excel export error:', error);
//     res.status(500).json({
//       message: 'Error generating Excel report',
//       error: error.message
//     });
//   }
// };
 
// // Create new transaction with file upload
// export const addTransaction = async (req, res) => {
//   try {
//     const { description, amount, type, category, remarks } = req.body;
 
//      // Validate required fields
//     if (!description || !amount || !type || !category) {
//       return res.status(400).json({
//         message: 'Description, amount, type, and category are required'
//       });
//     }
 
//     let attachment = null;
//      if (req.file) {
//       // Validate file type
//       const allowedMimeTypes = [
//         'application/pdf',
//         'image/jpeg',
//         'image/jpg',
//         'image/png',
//         'application/msword',
//         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//       ];
     
//       if (!allowedMimeTypes.includes(req.file.mimetype)) {
//         return res.status(400).json({
//           message: "Invalid file type. Supported formats: PDF, JPG, PNG, DOC, DOCX, XLSX"
//         });
//       }
 
//       // Validate file size (5MB max)
//       if (req.file.size > 5 * 1024 * 1024) {
//         return res.status(400).json({
//           message: "File size too large. Maximum size is 5MB."
//         });
//       }
 
//       attachment = {
//         filename: req.file.originalname,
//         originalName: req.file.originalname,
//         mimeType: req.file.mimetype,
//         size: req.file.size,
//         data: req.file.buffer // Store file data in buffer
//       };
//     }
 
//     const transaction = new Transaction({
//       description,
//       amount: parseFloat(amount),
//       type,
//       category,
//       remarks: remarks || '',
//       date: new Date(),
//       attachment,
//       createdBy: req.user?.id || "system"
//     });
 
//     await transaction.save();
 
//     res.status(201).json({
//       message: 'Transaction added successfully',
//       transaction
//     });
//   } catch (error) {
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         message: 'Validation error',
//         errors: Object.values(error.errors).map(e => e.message)
//       });
//     }
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// //Filter section for transaction
 
// export const filterTransaction =  async (req, res) => {
//   try {
//     const { type, category, search, page = 1, limit = 10 } = req.query;
   
//     const filter = {
//       $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     };
   
//     if (type) filter.type = type;
//     if (category) filter.category = category;
   
//     if (search) {
//       filter.$or = [
//         { description: { $regex: search, $options: 'i' } },
//         { remarks: { $regex: search, $options: 'i' } }
//       ];
//     }
 
//     const transactions = await Transaction.find(filter)
//       .sort({ date: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);
 
//     const total = await Transaction.countDocuments(filter);
 
//     // Calculate totals
//     const incomeTotal = await Transaction.aggregate([
//       { $match: { ...filter, type: 'Income' } },
//       { $group: { _id: null, total: { $sum: '$amount' } } }
//     ]);
 
//     const expenseTotal = await Transaction.aggregate([
//       { $match: { ...filter, type: 'Expense' } },
//       { $group: { _id: null, total: { $sum: '$amount' } } }
//     ]);
 
//     res.json({
//       transactions,
//       totalPages: Math.ceil(total / limit),
//       currentPage: page,
//       totals: {
//         income: incomeTotal[0]?.total || 0,
//         expenses: expenseTotal[0]?.total || 0,
//         net: (incomeTotal[0]?.total || 0) - (expenseTotal[0]?.total || 0)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// // Get single transaction
 
// export const getSingleTransaction = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOne({
//       _id: req.params.id,
//       $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     });
 
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }
 
//     res.json(transaction);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// // Download attachment
 
// export const downloadAttachment = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOne({
//       _id: req.params.id,
//        $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     });
 
//     if (!transaction || !transaction.attachment) {
//       return res.status(404).json({ message: 'Attachment not found' });
//     }
 
//     // Set headers for file download
//     res.setHeader('Content-Type', transaction.attachment.mimeType);
//     res.setHeader('Content-Disposition', `attachment; filename="${transaction.attachment.originalName}"`);
   
//     // Send the file buffer
//     res.send(transaction.attachment.data);
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// //Update transaction
 
// export const updateTransaction = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOneAndUpdate(
//       { _id: req.params.id,
//         createdBy: req.user.id },
//       req.body,
//       { new: true, runValidators: true }
//     );
 
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found' });
//     }
 
//     res.json({ message: 'Transaction updated successfully', transaction });
//   } catch (error) {
//     if (error.name === 'ValidationError') {
//       return res.status(400).json({
//         message: 'Validation error',
//         errors: Object.values(error.errors).map(e => e.message)
//       });
//     }
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// //delete transaction
 
// export const deleteTransaction = async (req, res) => {
//   try {
//     const transaction = await Transaction.findOneAndDelete({
//       _id: req.params.id,
//       $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     });
 
//     if (!transaction) {
//       return res.status(404).json({ message: 'Transaction not found or you do not have permission to delete this transaction' });
//     }
 
//     res.json({ message: 'Transaction deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
 
// //get transaction statistics
 
// export const getTransactionStats =  async (req, res) => {
//   try {
//     const { startDate, endDate } = req.query;
//     const filter = {
//       $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     };
 
//     if (startDate && endDate) {
//       filter.date = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }
 
//     const stats = await Transaction.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: '$type',
//           total: { $sum: '$amount' },
//           count: { $sum: 1 }
//         }
//       }
//     ]);
 
//     const income = stats.find(s => s._id === 'Income')?.total || 0;
//     const expenses = stats.find(s => s._id === 'Expense')?.total || 0;
 
//     res.json({
//       totalIncome: income,
//       totalExpenses: expenses,
//       netIncome: income - expenses,
//       transactionCount: stats.reduce((acc, curr) => acc + curr.count, 0)
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };
 
// // Get all transactions (for the merged controller compatibility)
// export const getTransactions = async (req, res) => {
//   try {
//     const { type, category, search } = req.query;
   
//     // Build filter object
//     const filters = {
//       $or: [
//         { createdBy: req.user?.id },
//         { createdBy: "system" }
//       ]
//     };
   
//     if (type) filters.type = type;
//     if (category) filters.category = category;
//     if (search) {
//       filters.$or = [
//         { description: { $regex: search, $options: 'i' } },
//         { remarks: { $regex: search, $options: 'i' } }
//       ];
//     }
 
//     const transactions = await Transaction.find(filters)
//       .sort({ date: -1, createdAt: -1 });
 
//     // Calculate totals
//     const totals = {
//       income: 0,
//       expenses: 0,
//       net: 0
//     };
 
//     transactions.forEach(transaction => {
//       if (transaction.type === 'Income') {
//         totals.income += transaction.amount;
//       } else if (transaction.type === 'Expense') {
//         totals.expenses += transaction.amount;
//       }
//     });
 
//     totals.net = totals.income - totals.expenses;
 
//     res.json({
//       transactions,
//       totals
//     });
 
//   } catch (error) {
//     console.error("Error fetching transactions:", error);
//     res.status(500).json({ message: "Error fetching transactions", error: error.message });
//   }
// };

import Transaction from '../models/Transaction.js';
import ExcelJS from 'exceljs';
 
//download transaction as excel
export const downloadExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
   
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Start date and end date are required'
      });
    }
 
    const filter = {
      $or: [
        { createdBy: req.user?.id },      // User's transactions
        { createdBy: "system" }           // System-generated transactions
      ],
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
 
    // Get transactions within date range
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .select('-attachment.data');
 
    if (transactions.length === 0) {
      return res.status(404).json({
        message: 'No transactions found for the selected date range'
      });
    }
 
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions Report');
 
    // Set default column widths
    worksheet.columns = [
      { width: 12 },  // A: Date
      { width: 25 },  // B: Description
      { width: 12 },  // C: Type
      { width: 18 },  // D: Category
      { width: 15 },  // E: Amount
      { width: 30 },  // F: Remarks
      { width: 12 },  // G: Receipt
      { width: 20 }   // H: Created At
    ];
 
    // Title Row
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'COMPREHENSIVE FINANCIAL PERFORMANCE OVERVIEW';
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: 'FFFFFFFF' }
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' }
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    titleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
 
    // Date Range Row
    worksheet.mergeCells('A2:H2');
    const dateRangeCell = worksheet.getCell('A2');
    dateRangeCell.value = `Date Range: ${formatDateDDMMYYYY(startDate)} to ${formatDateDDMMYYYY(endDate)}`;
 
    // Helper function
    function formatDateDDMMYYYY(dateString) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    dateRangeCell.font = {
      bold: true,
      size: 12,
      color: { argb: 'FF333333' }
    };
    dateRangeCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE9ECEF' }
    };
    dateRangeCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    dateRangeCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
 
    // Empty row for spacing
    worksheet.getRow(3).height = 5;
 
    // Column Headers Row
    const headerRow = worksheet.getRow(4);
    // const headerrowrange = worksheet.getCell('A4:H4')
    headerRow.values = [
      'DATE',
      'DESCRIPTION',
      'TYPE',
      'CATEGORY',
      'AMOUNT',
      'REMARKS',
      'RECEIPT',
      'CREATED AT'
    ];
   
    // Style header row
    headerRow.font = {
      bold: true,
      size: 11,
      color: { argb: 'FFFFFFFF' }
    };
 
    headerRow.eachCell((cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF495057' }
  };
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  });
   
    // Set each header cell individually for proper styling
    headerRow.eachCell((cell, colNumber) => {
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
      };
    });
 
    // Add transactions data
    let currentRow = 5;
   
    transactions.forEach((transaction, index) => {
      const row = worksheet.getRow(currentRow);
     
      // FIX: Properly check if attachment exists and has data
      const hasReceipt =
                        transaction.attachment.filename;
                        // transaction.attachment.filename &&
                        // transaction.attachment.data;
     
      const receiptStatus = hasReceipt ? 'Available' : 'Not Available';
     
      row.values = [
        transaction.date.toISOString().split('T')[0],
        transaction.description,
        transaction.type,
        transaction.category,
        transaction.amount,
        transaction.remarks || 'N/A',
        receiptStatus,
        transaction.createdAt.toLocaleString()
      ];
 
      // Style the row
      row.font = {
        size: 10
      };
     
      // Alternate row colors for better readability
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }
 
      // Add borders to all cells
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
       
        // Different alignment for different columns
        if (colNumber === 5) { // Amount column
          cell.alignment = {
            horizontal: 'right',
            vertical: 'middle'
          };
          cell.numFmt = '#,##0.00';
         
          // Color code amounts based on type
          if (transaction.type === 'Income') {
            cell.font = {
              color: { argb: 'FF008000' },
              bold: true
            };
          } else {
            cell.font = {
              color: { argb: 'FFFF0000' },
              bold: true
            };
          }
        } else if (colNumber === 7) { // Receipt column
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
         
          // Color code receipt status
          if (hasReceipt) {
            cell.font = {
              color: { argb: 'FF008000' },
              bold: true
            };
          } else {
            cell.font = {
              color: { argb: 'FF6C757D' } // Gray for not available
            };
          }
        } else if (colNumber === 1 || colNumber === 8) { // Date columns
          cell.alignment = {
            horizontal: 'center',
            vertical: 'middle'
          };
        } else {
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true
          };
        }
      });
 
      row.height = 20;
      currentRow++;
    });
 
    // Add empty row before summary
    worksheet.getRow(currentRow).height = 10;
    currentRow++;
 
    // SUMMARY SECTION
    // Calculate totals
    const incomeTotal = transactions
      .filter(t => t.type === 'Income')
      .reduce((sum, t) => sum + t.amount, 0);
   
    const expenseTotal = transactions
      .filter(t => t.type === 'Expense')
      .reduce((sum, t) => sum + t.amount, 0);
   
    const netTotal = incomeTotal - expenseTotal;
   
    // Count transactions with receipts (FIXED)
    const transactionsWithReceipts = transactions.filter(t =>
      t.attachment && t.attachment.filename && t.attachment.data
    ).length;
 
    // Summary Title
    worksheet.mergeCells(`A${currentRow}:H${currentRow}`);
    const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
    summaryTitleCell.value = 'FINANCIAL SUMMARY';
    summaryTitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: 'FFFFFFFF' }
    };
    summaryTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' }
    };
    summaryTitleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle'
    };
    summaryTitleCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    currentRow++;
 
    // Total Income
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const incomeLabelCell = worksheet.getCell(`A${currentRow}`);
    incomeLabelCell.value = 'Total Income';
    incomeLabelCell.font = { bold: true };
    incomeLabelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
   
    worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
    const incomeValueCell = worksheet.getCell(`E${currentRow}`);
    incomeValueCell.value = incomeTotal;
    incomeValueCell.numFmt = '#,##0.00';
    incomeValueCell.font = {
      bold: true,
      color: { argb: 'FF008000' }
    };
    incomeValueCell.alignment = { horizontal: 'right' };
    incomeValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    currentRow++;
 
    // Total Expenses
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const expenseLabelCell = worksheet.getCell(`A${currentRow}`);
    expenseLabelCell.value = 'Total Expenses';
    expenseLabelCell.font = { bold: true };
    expenseLabelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
   
    worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
    const expenseValueCell = worksheet.getCell(`E${currentRow}`);
    expenseValueCell.value = expenseTotal;
    expenseValueCell.numFmt = '#,##0.00';
    expenseValueCell.font = {
      bold: true,
      color: { argb: 'FFFF0000' }
    };
    expenseValueCell.alignment = { horizontal: 'right' };
    expenseValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    currentRow++;
 
    // Net Amount
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const netLabelCell = worksheet.getCell(`A${currentRow}`);
    netLabelCell.value = 'Net Amount';
    netLabelCell.font = { bold: true };
    netLabelCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
   
    worksheet.mergeCells(`E${currentRow}:H${currentRow}`);
    const netValueCell = worksheet.getCell(`E${currentRow}`);
    netValueCell.value = netTotal;
    netValueCell.numFmt = '#,##0.00';
    netValueCell.font = {
      bold: true,
      color: { argb: netTotal >= 0 ? 'FF008000' : 'FFFF0000' }
    };
    netValueCell.alignment = { horizontal: 'right' };
    netValueCell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    currentRow++;
 
    // Set response headers for file download
    const fileName = `transactions-report-${startDate}-to-${endDate}.xlsx`;
   
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
 
    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
 
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      message: 'Error generating Excel report',
      error: error.message
    });
  }
};
 
// Create new transaction with file upload
export const addTransaction = async (req, res) => {
  try {
    const { description, amount, type, category, remarks } = req.body;
 
     // Validate required fields
    if (!description || !amount || !type || !category) {
      return res.status(400).json({
        message: 'Description, amount, type, and category are required'
      });
    }
 
    let attachment = null;
     if (req.file) {
      // Validate file type
      const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
     
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Invalid file type. Supported formats: PDF, JPG, PNG, DOC, DOCX, XLSX"
        });
      }
 
      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          message: "File size too large. Maximum size is 5MB."
        });
      }
 
      attachment = {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: req.file.buffer // Store file data in buffer
      };
    }
 
    const transaction = new Transaction({
      description,
      amount: parseFloat(amount),
      type,
      category,
      remarks: remarks || '',
      date: new Date(),
      attachment,
      createdBy: req.user?.id || "system"
    });
 
    await transaction.save();
 
    res.status(201).json({
      message: 'Transaction added successfully',
      transaction
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
//Filter section for transaction
 
export const filterTransaction =  async (req, res) => {
  try {
    const { type, category, search, page = 1, limit = 10 } = req.query;
   
    const filter = {
      $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    };
   
    if (type) filter.type = type;
    if (category) filter.category = category;
   
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } }
      ];
    }
 
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
 
    const total = await Transaction.countDocuments(filter);
 
    // Calculate totals
    const incomeTotal = await Transaction.aggregate([
      { $match: { ...filter, type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
 
    const expenseTotal = await Transaction.aggregate([
      { $match: { ...filter, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
 
    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totals: {
        income: incomeTotal[0]?.total || 0,
        expenses: expenseTotal[0]?.total || 0,
        net: (incomeTotal[0]?.total || 0) - (expenseTotal[0]?.total || 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
// Get single transaction
 
export const getSingleTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    });
 
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
 
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
// Download attachment
 
export const downloadAttachment = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
       $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    });
 
    if (!transaction || !transaction.attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
 
    // Set headers for file download
    res.setHeader('Content-Type', transaction.attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${transaction.attachment.originalName}"`);
   
    // Send the file buffer
    res.send(transaction.attachment.data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
//Update transaction
 
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id,
        createdBy: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
 
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
 
    res.json({ message: 'Transaction updated successfully', transaction });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
//delete transaction
 
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    });
 
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found or you do not have permission to delete this transaction' });
    }
 
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
 
//get transaction statistics
 
export const getTransactionStats =  async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {
      $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    };
 
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
 
    const stats = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
 
    const income = stats.find(s => s._id === 'Income')?.total || 0;
    const expenses = stats.find(s => s._id === 'Expense')?.total || 0;
 
    res.json({
      totalIncome: income,
      totalExpenses: expenses,
      netIncome: income - expenses,
      transactionCount: stats.reduce((acc, curr) => acc + curr.count, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
 
// Get all transactions (for the merged controller compatibility)
export const getTransactions = async (req, res) => {
  try {
    const { type, category, search } = req.query;
   
    // Build filter object
    const filters = {
      $or: [
        { createdBy: req.user?.id },
        { createdBy: "system" }
      ]
    };
   
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (search) {
      filters.$or = [
        { description: { $regex: search, $options: 'i' } },
        { remarks: { $regex: search, $options: 'i' } }
      ];
    }
 
    const transactions = await Transaction.find(filters)
      .sort({ date: -1, createdAt: -1 });
 
    // Calculate totals
    const totals = {
      income: 0,
      expenses: 0,
      net: 0
    };
 
    transactions.forEach(transaction => {
      if (transaction.type === 'Income') {
        totals.income += transaction.amount;
      } else if (transaction.type === 'Expense') {
        totals.expenses += transaction.amount;
      }
    });
 
    totals.net = totals.income - totals.expenses;
 
    res.json({
      transactions,
      totals
    });
 
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ message: "Error fetching transactions", error: error.message });
  }
};
 