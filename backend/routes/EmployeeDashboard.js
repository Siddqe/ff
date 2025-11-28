import express from 'express';
import Employee from '../models/Employee.js';
import Salary from '../models/Salary.js';
import Payslip from '../models/Payslip.js';
import { authenticateToken } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import numberToWords from 'number-to-words';


const router = express.Router();

// Get employee profile details
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.user.personId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({
      employee: {
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department,
        phone: employee.phone,
        address: employee.address,
        joiningDate: employee.joiningDate,
        createdAt: employee.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching employee profile:', error);
    res.status(500).json({ message: 'Server error while fetching employee profile' });
  }
});

// Get employee salary history
router.get('/salary-history', authenticateToken, async (req, res) => {
  try {
    const salaries = await Salary.find({ employeeId: req.user.personId })
      .sort({ year: -1, month: -1 })
      .select('month year basicSalary grossEarnings totalDeductions netPay status payDate');

    res.json({ salaries });
  } catch (error) {
    console.error('Error fetching salary history:', error);
    res.status(500).json({ message: 'Server error while fetching salary history' });
  }
});

// Get employee payslips
router.get('/payslips', authenticateToken, async (req, res) => {
  try {
    const payslips = await Payslip.find({ employeeId: req.user.personId })
      .sort({ year: -1, month: -1 })
      .select('month year payDate netPay grossEarnings totalDeductions createdAt');

    res.json({ payslips });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ message: 'Server error while fetching payslips' });
  }
});

// Get detailed payslip by ID
router.get('/payslip/:id', authenticateToken, async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ 
      _id: req.params.id, 
      employeeId: req.user.personId 
    });

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    res.json({ payslip });
  } catch (error) {
    console.error('Error fetching payslip details:', error);
    res.status(500).json({ message: 'Server error while fetching payslip details' });
  }
});

// Get current month salary
router.get('/current-salary', authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    const currentSalary = await Salary.findOne({
      employeeId: req.user.personId,
      month: currentMonth,
      year: currentYear
    });

    res.json({ currentSalary });
  } catch (error) {
    console.error('Error fetching current salary:', error);
    res.status(500).json({ message: 'Server error while fetching current salary' });
  }
});

// Get salary statistics
router.get('/salary-stats', authenticateToken, async (req, res) => {
  try {
    const salaries = await Salary.find({ employeeId: req.user.personId });
    
    const stats = {
      totalSalaries: salaries.length,
      totalEarned: salaries.reduce((sum, salary) => sum + salary.netPay, 0),
      averageSalary: salaries.length > 0 ? salaries.reduce((sum, salary) => sum + salary.netPay, 0) / salaries.length : 0,
      highestSalary: salaries.length > 0 ? Math.max(...salaries.map(s => s.netPay)) : 0,
      paidMonths: salaries.filter(s => s.status === 'paid').length
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching salary stats:', error);
    res.status(500).json({ message: 'Server error while fetching salary statistics' });
  }
});

router.get('/payslip/:id/download', authenticateToken, async (req, res) => {
    try {
    const payslip = await Payslip.findById(req.params.id).lean();
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    // Check if the related salary record is active (enabled)
    const salary = await Salary.findById(payslip.salaryId).lean();
    if (!salary || salary.activeStatus !== 'enabled') {
      return res.status(403).json({
        message: 'Payslip cannot be downloaded because the salary record is not active',
      });
    }


    // Create PDF
    const doc = new PDFDocument();
    const filename = `payslip-${payslip.employeeId}-${payslip.month}-${payslip.year}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    doc.pipe(res);
    
    // PDF content
    //doc.image(path.join(__dirname, "logo.png"), 50, 40, { width:40 }); // company logo
    doc.fontSize(18).fillColor("#000").text("Zynith IT Solutions", 100, 45);
    doc.fontSize(10).fillColor("gray").text("Chennai, India", 100, 65);
    doc.fontSize(15).fillColor("gray").text("Payslip For the Month", 380, 47);
    doc.fontSize(12).text(`${payslip.month}`, 475, 75);

    doc.moveTo(50, 100).lineTo(550, 100).strokeColor("#ccc").stroke();

    doc.fontSize(12).fillColor("black").text("EMPLOYEE SUMMARY", 50, 120);
    doc.fontSize(11).fillColor("gray").text("Employee Name", 50, 140);
    doc.text(":", 138, 140);
    doc.fontSize(11).fillColor("black").text(payslip.name, 150, 140);

    doc.fontSize(11).fillColor("gray").text("Employee ID", 50, 160);
    doc.text(":", 138, 160);
    doc.fontSize(11).fillColor("black").text(payslip.employeeId, 150, 160);

    doc.fontSize(11).fillColor("gray").text("Designation", 50, 180);
    doc.text(":", 138, 180);
    doc.fontSize(11).fillColor("black").text(payslip.designation, 150, 180);

    doc.fontSize(11).fillColor("gray").text("Pay Period", 50, 200);
    doc.text(":", 138, 200);
    doc.fontSize(11).fillColor("black").text(payslip.month, 150, 200);

    doc.fontSize(11).fillColor("gray").text("Pay Date", 50, 220);
    doc.text(":", 138, 220);
    doc.fontSize(11).fillColor("black").text(`${(payslip.payDate).toLocaleDateString("en-GB")}`,150, 220);

    const boxX = 350;
    const boxY = 120;
    const boxWidth = 200;
    const boxHeight = 120;
    const radius = 10;

    doc.save();
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight-65, radius)
    .fillOpacity(1)   // solid
    .fillAndStroke("#f2fef6", "#cccccc"); // very light green + grey border
    doc.restore();

    doc.save();
    doc.roundedRect(boxX, boxY+68, boxWidth, boxHeight-65, radius)
    .fillOpacity(1)   // solid
    .fillAndStroke("#e6f3ff", "#cccccc"); // very light green + grey border
    doc.restore();
    
    // ✅ Bold Green Monthly CTC
    doc.fontSize(18).fillColor("#0a9f49").font("Helvetica-Bold")
    .text("Rs.", boxX+15, boxY+15);
    doc.text(payslip.monthlyCtc.toFixed(2), boxX + 46, boxY + 15); // Changed from monthlyCtc to monthlyCtc

    doc.fontSize(11).fillColor("gray").font("Helvetica")
    .text("Monthly CTC", boxX+15, boxY + 32);

    // Paid Days / LOP Days
    doc.fontSize(11).fillColor("black").text("Paid Days :", boxX +20, boxY + 80);
    doc.text(payslip.paidDays, boxX + 120, boxY + 80);

    doc.text("LOP Days :", boxX + 20, boxY + 100);
    doc.text(payslip.lopDays, boxX + 120, boxY + 100);

    doc.moveTo(50, 263).lineTo(550, 263).strokeColor("#ccc").stroke();

    doc.moveDown(2);

    doc.fontSize(11).fillColor("gray").text("Remaining Leave", 50, 273);
    doc.text(":", 138, 273);
    doc.fontSize(11).fillColor("black").text(payslip.remainingLeaves, 150, 273);

    doc.fontSize(11).fillColor("gray").text("Leaves Taken", 290, 273);
    doc.text(":", 378, 273);
    doc.fontSize(11).fillColor("black").text(payslip.leaveTaken, 390, 273);

    const tableX = 50;
    const tableY = 300;
    const tableWidth = 500;
    const tableHeight = 120;

    doc.save();
    doc.roundedRect(tableX, tableY, tableWidth, tableHeight+20, radius)
    .fillAndStroke("#ffffff","#cccccc"); // very light green + grey border
    doc.restore();

    // Table Headers
    doc.fontSize(11).font("Helvetica-Bold").fillColor("black");

    doc.text("EARNINGS", tableX + 20, tableY + 10);
    doc.text("AMOUNT", tableX + 170, tableY + 10);

    doc.text("DEDUCTIONS", tableX + 270, tableY + 10);
    doc.text("AMOUNT", tableX + 430, tableY + 10);

    doc.moveTo(tableX + 20, tableY + 28)
    .lineTo(270, tableY + 28)
    .dash(2, { space: 2 })
    .strokeColor("#999999")
    .stroke()
    .undash();

    doc.moveTo(320, tableY + 28)
    .lineTo(530, tableY + 28)
    .dash(2, { space: 2 })
    .strokeColor("#999999")
    .stroke()
    .undash();

    // Reset font
    doc.fontSize(11).font("Helvetica").fillColor("black");

    let y = tableY + 50;
    payslip.earnings.forEach(e => {
        doc.text(`${e.type}`, tableX + 20, y);
        doc.text(`Rs . ${e.amount.toFixed(2)}`, tableX + 140, y, { align:"right", width: 80 });
        doc.font("Helvetica");
        y += 20;
    });

    doc.font("Helvetica");

    // Deductions Loop (separate y2, same alignment as before)
    let y2 = tableY + 50;
    payslip.deductions.forEach(d => {
        doc.text(`${d.type}`, tableX + 270, y2);
        doc.text(`Rs . ${d.amount.toFixed(2)}`, tableX + 400, y2, { align:"right", width: 80 });
        doc.font("Helvetica");
        y2 += 20;
    });

    doc.moveTo(tableX + 20, 415)
    .lineTo(270, 415)
    .dash(2, { space: 2 })
    .strokeColor("#999999")
    .stroke()
    .undash();

    doc.moveTo(320, 415)
    .lineTo(530, 415)
    .dash(2, { space: 2 })
    .strokeColor("#999999")
    .stroke()
    .undash();

    //let bottomY = tableY + tableHeight - 30;
    doc.font("Helvetica-Bold").text("Gross Earnings", tableX + 20, 423);
    doc.text(`Rs . ${payslip.grossEarnings.toFixed(2)}`, tableX + 140, 423, {align: "right", width: 80 });

    doc.font("Helvetica-Bold").text("Total Deductions", tableX + 270, 423);
    doc.text(`Rs . ${payslip.totalDeductions.toFixed(2)}`, tableX + 400, 423, {align: "right", width: 80 });

    doc.save();
    doc.roundedRect(50, 470, 500, 45, radius)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .stroke();

    const greenWidth = 150; // adjust width of green area
    doc.save();
    doc.roundedRect(50 + (500 - greenWidth), 470, greenWidth, 45, radius)
        .clip(); // clip only right section
    doc.rect(50 + (500 - greenWidth), 470, greenWidth, 45)
        .fill("#e6f9ef"); // light green fill
    doc.restore();

    // Left text
    doc.font("Helvetica-Bold").fontSize(10).fillColor("black")
    .text("TOTAL NET PAYABLE", 50 + 10, 470 + 13);

    doc.font("Helvetica").fontSize(10).fillColor("gray")
    .text("Gross Earnings - Total Deductions", 50 + 10, 470 + 27);

    // Right text (Net Pay in bold)
    doc.font("Helvetica-Bold").fontSize(14).fillColor("black")
    .text(`Rs. ${payslip.netPay.toFixed(2)}`, 310, 470 + 18, {
        align: "right",
        width: boxWidth - 10
    });

    const amountWords = numberToWords.toWords(payslip.netPay).replace(/\b\w/g, c => c.toUpperCase());
    doc.font("Helvetica-Bold").fontSize(10).fillColor("black").text(`${amountWords} Rupees Only`, 50, 530, { width: 380, align: "center" });
    doc.moveTo(50, 550).lineTo(550, 550).strokeColor("#ccc").stroke();
    
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Server error while generating PDF' });
  }
});

export default router;