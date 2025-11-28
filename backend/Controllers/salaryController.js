// import Salary from '../models/Salary.js';
// import Employee from '../models/Employee.js';

// import { sendPayslipEmail } from '../services/emailService.js';
// import PDFDocument from 'pdfkit';

// //Get all employee
// export const getAllEmployee = async (req, res) => {
//   try {
//     const employees = await Employee.find().select('employeeId name email designation department');
//     res.json({ employees });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while fetching employees' });
//   }
// };

// //get employee by id
// export const getEmployeeById = async (req, res) => {
//   try {
//     const employee = await Employee.findOne({ employeeId: req.params.employeeId });
//     if (!employee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }
//     res.json({ employee });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while fetching employee' });
//   }
// };

// //add salary
// export const createSalary = async (req, res) => {
//   try {
//     const { 
//       employeeId, 
//       month, 
//       year,
//       designation,
//       TotalSalary, 
//       paidDays, 
//       lopDays, 
//       totalLeaves,
//       leavesTaken,
//       remainingLeaves,
//       earnings, 
//       deductions 
//     } = req.body;

 
//     // Check if salary already exists for this employee and month
//     // const existingSalary = await Salary.findOne({ employeeId, month, year });
//     // if (existingSalary) {
//     //   return res.status(400).json({ message: 'Salary record already exists for this employee and month' });
//     // }
 
//     // Get employee details
//     const employee = await Employee.findOne({ employeeId });
//     if (!employee) {
//       return res.status(404).json({ message: 'Employee not found' });
//     }
 
//     const salaryData = {
//       employeeId,
//       name: employee.name,
//       email: employee.email,
//       designation : employee.designation,
//       month,
//       year: year || new Date().getFullYear(),
//       TotalSalary,
//       paidDays: paidDays || 22,
//       lopDays: lopDays || 0,
//       totalLeaves: totalLeaves || 22,
//       leavesTaken: leavesTaken || 0,
//       remainingLeaves: remainingLeaves || 22,
//       earnings,
//       deductions
//     };
 
//     const salary = new Salary(salaryData);
//     await salary.save();
 
//     res.status(201).json({
//       message: 'Salary record created successfully',
//       salary
//     });
//   } catch (error) {
//     console.error('Error creating salary:', error);
//     res.status(500).json({ message: 'Server error while creating salary record' });
//   }
// };

// //get all salary 
// export const getAllSalaryRecord = async (req, res) => {
//   try {
//     const salaries = await Salary.find().sort({ createdAt: -1 });
   
//     // Get payslip counts for each employee
//     const salaryData = await Promise.all(
//       salaries.map(async (salary) => {
//         const payslipCount = await Payslip.countDocuments({ employeeId: salary.employeeId });
//         return {
//           ...salary.toObject(),
//           payslipCount
//         };
//       })
//     );
 
//     res.json({ salaries: salaryData });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while fetching salaries' });
//   }
// };

// //get salary by id
// export const getSalaryRecordById = async (req, res) => {
//   try {
//     const salary = await Salary.findById(req.params.id);
//     if (!salary) {
//       return res.status(404).json({ message: 'Salary record not found' });
//     }
//     res.json({ salary });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while fetching salary' });
//   }
// };

// //update salary
// export const updateSalary = async (req, res) => {
//   try {
//     const salary = await Salary.findByIdAndUpdate(
//       req.params.id,
//       { $set: req.body },
//       { new: true, runValidators: true }
//     );
//     if (!salary) {
//       return res.status(404).json({ message: 'Salary record not found' });
//     }
//     res.json({ message: 'Salary record updated successfully', salary });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while updating salary' });
//   }
// };

// //delete salary
// export const deleteSalary = async (req, res) => {
//   try {
//     const salary = await Salary.findByIdAndDelete(req.params.id);
//     if (!salary) {
//       return res.status(404).json({ message: 'Salary record not found' });
//     }
   
//     // Also delete associated payslips
//     await Payslip.deleteMany({ salaryId: req.params.id });
   
//     res.json({ message: 'Salary record deleted successfully' });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while deleting salary' });
//   }
// };

// export const GeneratePayslip = async (req, res) => {
//   try {
//     const salary = await Salary.findById(req.params.id);
//     if (!salary) {
//       return res.status(404).json({ message: 'Salary record not found' });
//     }
 
//     // Check if payslip already exists
//       const existingPayslip = await Payslip.findOne({
//       employeeId: salary.employeeId,
//       month: salary.month,
//       year: salary.year
//     });
 
//        if (existingPayslip) {
//       return res.status(400).json({
//         message: `Payslip already generated for ${salary.month} ${salary.year}`
//       });
//     }
 
//     // Create payslip record
//     const payslipData = {
//       salaryId: salary._id,
//       employeeId: salary.employeeId,
//       name: salary.name,
//       email: salary.email,
//       designation: salary.designation,
//       month: salary.month,
//       year: salary.year,
//       payDate: salary.payDate,
//       TotalSalary: salary.TotalSalary,
//       grossEarnings: salary.grossEarnings,
//       totalDeductions: salary.totalDeductions,
//       netPay: salary.netPay,
//       paidDays: salary.paidDays,
//       lopDays: salary.lopDays,
//       totalLeaves: salary.totalLeaves,
//       leavesTaken: salary.leavesTaken,
//       remainingLeaves: salary.remainingLeaves,
//       earnings: salary.earnings,
//       deductions: salary.deductions
//     };
 
//     const payslip = new Payslip(payslipData);
//     await payslip.save();
 
//     // Update salary status to paid
//     salary.status = 'paid';
//     await salary.save();
 
//     // Send email with payslip
//     const emailResult = await sendPayslipEmail(payslip);
 
//     res.json({
//       message: 'Payslip generated and sent successfully',
//       payslip,
//       emailSent: emailResult.success
//     });
//   } catch (error) {
//     console.error('Error generating payslip:', error);
//     res.status(500).json({ message: 'Server error while generating payslip' });
//   }
// };

// export const getEmployeePayslip = async (req, res) => {
//   try {
//     const payslips = await Payslip.find({ employeeId: req.params.employeeId })
//       .sort({ createdAt: -1 });
//     res.json({ payslips });
//   } catch (error) {
//     res.status(500).json({ message: 'Server error while fetching payslips' });
//   }
// };



