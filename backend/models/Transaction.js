import mongoose from 'mongoose';
 
const transactionSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['Income', 'Expense']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  remarks: {
    type: String,
    default: ''
  },
  attachment: {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    data: Buffer // Store file data as buffer
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'test-user' // Changed to string for testing
  }
}, {
  timestamps: true
});
 
// Index for better query performance
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ createdBy: 1, date: -1 });
 
const Transaction = mongoose.model('Transaction', transactionSchema);
 
export default Transaction;