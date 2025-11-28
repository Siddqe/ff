import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema({
  salaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salary',
    required: true
  },
  employeeId: { 
    type: String, 
    required: true, 
    ref: 'Employee' 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  designation: { 
    type: String, 
    required: true 
  },
  panNo : {
    type: String, 
    required: true,
    uppercase: true,
    trim: true
  },
  month: { 
    type: String, 
    required: true 
  },
  year: {
    type: Number,
    required: true
  },
  payDate: { 
    type: Date, 
    required: true 
  },
  basicSalary: {
    type: Number,
    required: true
  },
  grossEarnings: { 
    type: Number, 
    required: true 
  },
  totalDeductions: { 
    type: Number, 
    required: true 
  },
  netPay: { 
    type: Number, 
    required: true 
  },
  paidDays: { 
    type: Number, 
    default: 0 
  },
  lopDays: { 
    type: Number, 
    default: 0 
  },
  remainingLeaves: { 
    type: Number, 
    default: 0 
  },
  leaveTaken: { 
    type: Number, 
    default: 0 
  },  
  earnings: [
    { 
      type: { 
        type: String, 
        required: true 
      }, 
      amount: { 
        type: Number, 
        required: true 
      },
      percentage: {
        type: Number,
        default: 0
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
        required: true 
      },
      percentage: {
        type: Number,
        default: 0
      },
      calculationType: {
        type: String,
        enum: ['amount', 'percentage'],
        default: 'amount'
      }
    }
  ],
  pdfPath: {
    type: String,
    default: ''
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Payslip', payslipSchema);