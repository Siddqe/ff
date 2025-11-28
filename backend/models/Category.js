import mongoose from 'mongoose';
 
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Category type is required'],
    enum: {
      values: ['employee-role', 'employee-designation', 'transaction-income', 'transaction-expense'],
      message: 'Invalid category type'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});
 
// Compound index to ensure unique category names per type
categorySchema.index({ name: 1, type: 1 }, { unique: true });
 
// Static method to get categories by type
categorySchema.statics.getCategoriesByType = async function(type) {
  return await this.find({ type, isActive: true })
    .sort({ name: 1 })
    .select('name description type createdAt');
};
 
// Static method to check if category exists
categorySchema.statics.categoryExists = async function(name, type) {
  const category = await this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    type,
    isActive: true
  });
  return !!category;
};
 
// Static method to get category statistics
categorySchema.statics.getCategoryStats = async function() {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
 
  return {
    'employee-role': stats.find(stat => stat._id === 'employee-role')?.count || 0,
    'employee-designation': stats.find(stat => stat._id === 'employee-designation')?.count || 0,
    'transaction-income': stats.find(stat => stat._id === 'transaction-income')?.count || 0,
    'transaction-expense': stats.find(stat => stat._id === 'transaction-expense')?.count || 0,
  };
};
 
// Static method to get transaction categories (both income and expense)
categorySchema.statics.getTransactionCategories = async function() {
  const [incomeCategories, expenseCategories] = await Promise.all([
    this.getCategoriesByType('transaction-income'),
    this.getCategoriesByType('transaction-expense')
  ]);
 
  return {
    income: incomeCategories,
    expense: expenseCategories
  };
};
 
const Category = mongoose.model('Category', categorySchema);
export default Category;