import React, { useState } from 'react';
import { categoryService, defaultCategory } from '../../../services/categoryService';
import './CategoryModal.css';
 
const CategoryModal = ({
  isOpen,
  onClose,
  typeConfig,
  categories,
  onCategoriesUpdate
}) => {
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    ...defaultCategory,
    type: typeConfig.id
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
 
  if (!isOpen) return null;
 
  const handleSubmit = async (e) => {
    e.preventDefault();
   
    // Validate category data
    const validationErrors = categoryService.validateCategory(newCategory);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
 
    try {
      setLoading(true);
      const result = await categoryService.createCategory(newCategory);
     
      if (result.success) {
        setNewCategory({ ...defaultCategory, type: typeConfig.id });
        setShowForm(false);
        setErrors({});
        onCategoriesUpdate();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setErrors({
        submit: error.response?.data?.message || error.message || 'Error creating category'
      });
    } finally {
      setLoading(false);
    }
  };
 
  const handleInputChange = (field, value) => {
    setNewCategory(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    // Clear submit error when user makes any change
    if (errors.submit) {
      setErrors(prev => ({
        ...prev,
        submit: ''
      }));
    }
  };
 
  const handleEdit = (category) => {
    setEditingId(category._id);
    setEditValue(category.name);
    setEditDescription(category.description || '');
  };
 
  const handleSaveEdit = async (categoryId) => {
    try {
      // Validate edit data
      if (!editValue.trim()) {
        alert('Category name is required');
        return;
      }
 
      const result = await categoryService.updateCategory(categoryId, {
        name: editValue,
        description: editDescription
      });
 
      if (result.success) {
        setEditingId(null);
        setEditValue('');
        setEditDescription('');
        onCategoriesUpdate();
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category: ' + (error.response?.data?.message || error.message));
    }
  };
 
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
    setEditDescription('');
  };
 
  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const result = await categoryService.deleteCategory(categoryId);
        if (result.success) {
          onCategoriesUpdate();
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category: ' + (error.response?.data?.message || error.message));
      }
    }
  };
 
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
 
  const suggestions = typeConfig.suggestions || [];
 
  // SVG Icons
  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
 
  const DeleteIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M10 11v6"/>
      <path d="M14 11v6"/>
    </svg>
  );
 
  const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  );
 
  const CancelIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
 
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content table-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div
              className="modal-icon"
              style={{ backgroundColor: `${typeConfig.color}20`, color: typeConfig.color }}
            >
              {typeConfig.icon}
            </div>
            <div>
              <h2>{typeConfig.title}</h2>
              <p>{typeConfig.description}</p>
            </div>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
 
        <div className="modal-body">
          {/* Add Category Section */}
          <div className="add-category-section compact-form">
            <div className="section-header">
              <h3>Add New Category</h3>
              <button
                className={`toggle-form-btn ${showForm ? 'active' : ''}`}
                onClick={() => setShowForm(!showForm)}
                type="button"
              >
                {showForm ? '−' : '+'}
              </button>
            </div>
 
            {showForm && (
              <form className="category-form" onSubmit={handleSubmit}>
                <div className="forms-row">
                  <div className="form-group compact-field">
                    <label htmlFor="categoryName">Category Name *</label>
                    <input
                      type="text"
                      id="categoryName"
                      value={newCategory.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={typeConfig.placeholder || "e.g., Software Developer"}
                      className={errors.name ? 'error' : ''}
                      disabled={loading}
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                  </div>
                 
                  <div className="form-group compact-field">
                    <label htmlFor="categoryDescription">Description (Optional)</label>
                    <input
                      type="text"
                      id="categoryDescription"
                      value={newCategory.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter a brief description..."
                      className={errors.description ? 'error' : ''}
                      disabled={loading}
                    />
                    {errors.description && <span className="error-message">{errors.description}</span>}
                  </div>
                </div>
 
                {/* Quick Suggestions */}
                {suggestions.length > 0 && newCategory.name.length === 0 && (
                  <div className="suggestions">
                    <span className="suggestions-label">Popular categories:</span>
                    <div className="suggestions-list">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => handleInputChange('name', suggestion)}
                          disabled={loading}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
 
                <div className="form-actions">
                  <button
                    type="submit"
                    className="save-btn"
                    disabled={loading}
                  >
                    {loading ? 'Adding...' : 'Add Category'}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setShowForm(false);
                      setNewCategory({ ...defaultCategory, type: typeConfig.id });
                      setErrors({});
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
 
                {errors.submit && (
                  <div className="submit-error">{errors.submit}</div>
                )}
              </form>
            )}
          </div>
 
          {/* Categories Table Section */}
          <div className="categories-table-section">
            <div className="table-header">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
 
            {filteredCategories.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h4>No categories found</h4>
                <p>
                  {searchTerm ? 'Try adjusting your search terms' : `Get started by adding your first ${typeConfig.title.toLowerCase()}`}
                </p>
              </div>
            ) : (
              <div className="categories-table-container">
                <table className="categories-table">
                  <thead>
                    <tr>
                      <th className="category-column">Category</th>
                      <th className="description-column">Description</th>
                      <th className="date-column">Date Added</th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category._id} className="category-row">
                        {editingId === category._id ? (
                          <>
                            <td>
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="edit-input"
                                placeholder="Category name"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="edit-input"
                                placeholder="Description"
                              />
                            </td>
                            <td>
                              <span className="category-date">
                                {new Date(category.createdAt).toLocaleDateString('en-GB')}
                              </span>
                            </td>
                            <td>
                              <div className="edit-actions">
                                <button
                                  onClick={() => handleSaveEdit(category._id)}
                                  className="save-edit-btn"
                                  title="Save"
                                >
                                  <SaveIcon />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="cancel-edit-btn"
                                  title="Cancel"
                                >
                                  <CancelIcon />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td>
                              <span className="category-name">{category.name}</span>
                            </td>
                            <td>
                              <span className="category-description">
                                {category.description || '-'}
                              </span>
                            </td>
                            <td>
                              <span className="category-date">
                                Added {new Date(category.createdAt).toLocaleDateString('en-GB')}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => handleEdit(category)}
                                  className="edit-btn"
                                  title="Edit"
                                >
                                  <EditIcon />
                                </button>
                                <button
                                  onClick={() => handleDelete(category._id)}
                                  className="delete-btn"
                                  title="Delete"
                                >
                                  <DeleteIcon />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default CategoryModal;