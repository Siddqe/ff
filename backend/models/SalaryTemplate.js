import mongoose from 'mongoose';

const salaryTemplateSchema = new mongoose.Schema({
  designation: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  earnings: [
    {
      type: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      calculationType: {
        type: String,
        enum: ['amount', 'percentage'],
        default: 'amount'
      }
    }
  ],
  deductions: [
    {
      type: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      calculationType: {
        type: String,
        enum: ['amount', 'percentage'],
        default: 'amount'
      }
    }
  ],
  remainingLeaves: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Pre-save hook to calculate amounts based on percentages
salaryTemplateSchema.pre('save', function(next) {
  // Calculate earnings amounts based on percentages
  this.earnings = this.earnings.map(earning => {
    if (earning.calculationType === 'percentage' && earning.percentage > 0) {
      return {
        ...earning.toObject ? earning.toObject() : earning,
        amount: Math.round((this.basicSalary * earning.percentage) / 100)
      };
    }
    return earning;
  });

  // Calculate deductions amounts based on percentages
  this.deductions = this.deductions.map(deduction => {
    if (deduction.calculationType === 'percentage' && deduction.percentage > 0) {
      return {
        ...deduction.toObject ? deduction.toObject() : deduction,
        amount: Math.round((this.basicSalary * deduction.percentage) / 100)
      };
    }
    return deduction;
  });

  next();
});

// Static method to create salary from template
salaryTemplateSchema.statics.createSalaryFromTemplate = async function(employee, template) {
  const Salary = mongoose.model('Salary');
  
  const currentDate = new Date();
  const month = currentDate.toLocaleDateString("en-US", { month: "long" });
  const year = currentDate.getFullYear();

  // Calculate gross earnings and total deductions
  const grossEarnings = template.earnings.reduce((sum, earning) => sum + earning.amount, 0);
  const totalDeductions = template.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
  const netPay = grossEarnings - totalDeductions;

  const salaryData = {
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.email,
    designation: employee.designation,
    panNo: employee.panNumber,
    month: month,
    year: year,
    basicSalary: template.basicSalary,
    grossEarnings: grossEarnings,
    totalDeductions: totalDeductions,
    netPay: netPay,
    paidDays: 30, // Default full month
    lopDays: 0,
    remainingLeaves: template.remainingLeaves,
    leaveTaken: 0,
    earnings: template.earnings,
    deductions: template.deductions,
    activeStatus: 'enabled',
    status: 'draft'
  };

  const salary = new Salary(salaryData);
  return await salary.save();
};

// Static method to get template by designation
salaryTemplateSchema.statics.getTemplateByDesignation = function(designation) {
  return this.findOne({ 
    designation: new RegExp(`^${designation}$`, 'i'),
    status: 'active'
  });
};

const SalaryTemplate = mongoose.model('SalaryTemplate', salaryTemplateSchema);

export default SalaryTemplate;