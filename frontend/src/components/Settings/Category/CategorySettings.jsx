import React, { useState, useEffect } from 'react';
import { categoryService, categoryTypes } from '../../../services/categoryService';
import CategoryModal from './CategoryModal';
import './CategorySettings.css';
 
const CategorySettings = () => {
  const [categories, setCategories] = useState({
    'employee-role': [],
    'employee-designation': [],
    'transaction-category': []
  });
  const [stats, setStats] = useState({
    'employee-role': 0,
    'employee-designation': 0,
    'transaction-category': 0
  });
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
 
  // Load all categories and statistics from API
  useEffect(() => {
    loadAllCategories();
  }, []);
 
  const loadAllCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await categoryService.getAllCategories();
     
      if (result.success) {
        setCategories(result.data);
        setStats(result.stats);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };
 
  const handleModalOpen = (type) => {
    setActiveModal(type);
  };
 
  const handleModalClose = () => {
    setActiveModal(null);
  };
 
  const handleCategoriesUpdate = async (type) => {
    // Refresh the specific category type from API
    try {
      const result = await categoryService.getCategoriesByType(type);
      if (result.success) {
        setCategories(prev => ({
          ...prev,
          [type]: result.data
        }));
        setStats(prev => ({
          ...prev,
          [type]: result.count
        }));
      }
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
    }
  };
 
  if (loading) {
    return (
      <div className="category-settings">
        <div className="settings-header">
          <h1>Category Settings</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="category-settings">
      {/* <div className="settings-header">
        <h1>Category Settings</h1>
      </div> */}
 
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
          <button onClick={loadAllCategories} className="retry-btn">
            Retry
          </button>
        </div>
      )}
 
      <div className="category-grid-2x2">
        {categoryTypes.map((typeConfig) => (
          <div
            key={typeConfig.id}
            className="category-card-compact"
            onClick={() => handleModalOpen(typeConfig.id)}
          >
            <div className="card-header">
              <div
                className="category-icon-compact"
                style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
              >
                {typeConfig.icon}
              </div>
              <div className="card-stats">
                <span className="category-count-compact">{stats[typeConfig.id] || 0}</span>
                <span className="category-label-compact">categories</span>
              </div>
            </div>
            <div className="card-content">
              <h3 className="category-title-compact">{typeConfig.title}</h3>
              <p className="category-description-compact">{typeConfig.description}</p>
            </div>
            <div className="card-arrow">→</div>
          </div>
        ))}
      </div>
 
      {/* Modal for each category type */}
      {categoryTypes.map((typeConfig) => (
        <CategoryModal
          key={typeConfig.id}
          isOpen={activeModal === typeConfig.id}
          onClose={handleModalClose}
          typeConfig={typeConfig}
          categories={categories[typeConfig.id]}
          onCategoriesUpdate={() => handleCategoriesUpdate(typeConfig.id)}
        />
      ))}
    </div>
  );
};
 
export default CategorySettings;