import React, { useState } from 'react';
import { categoryService, defaultCategory } from '../../../services/categoryService';
import CategoryManager from './CategoryManager';

const TransactionCategoryManager = ({ categories, onUpdate, suggestions }) => {
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    ...defaultCategory,
    type: 'transaction-category'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = categoryService.validateCategory(newCategory);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setLoading(true);
      const result = await categoryService.createCategory(newCategory);
      
      if (result.success) {
        setNewCategory({ ...defaultCategory, type: 'transaction-category' });
        setShowForm(false);
        setErrors({});
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating transaction category:', error);
      setErrors({ submit: error.response?.data?.message || 'Error creating category' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setNewCategory(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <CategoryManager
      title="Transaction Categories"
      
      categories={categories}
      categoryType="transaction-category"
      showForm={showForm}
      setShowForm={setShowForm}
      newCategory={newCategory}
      errors={errors}
      loading={loading}
      suggestions={suggestions}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      onUpdate={onUpdate}
      placeholder="e.g., Salary, Office Supplies, Marketing"
    />
  );
};

export default TransactionCategoryManager;