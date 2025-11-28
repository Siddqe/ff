import React, { useState } from 'react';
import { categoryService, defaultCategory } from '../../../services/categoryService';
import CategoryManager from './CategoryManager';

const EmployeeDesignationManager = ({ categories, onUpdate, suggestions }) => {
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    ...defaultCategory,
    type: 'employee-designation'
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
        setNewCategory({ ...defaultCategory, type: 'employee-designation' });
        setShowForm(false);
        setErrors({});
        onUpdate();
      }
    } catch (error) {
      console.error('Error creating employee designation:', error);
      setErrors({ submit: error.response?.data?.message || 'Error creating designation' });
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
      title="Employee Designations"
    
      categories={categories}
      categoryType="employee-designation"
      showForm={showForm}
      setShowForm={setShowForm}
      newCategory={newCategory}
      errors={errors}
      loading={loading}
      suggestions={suggestions}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      onUpdate={onUpdate}
      placeholder="e.g., Junior, Senior, Team Lead"
    />
  );
};

export default EmployeeDesignationManager;