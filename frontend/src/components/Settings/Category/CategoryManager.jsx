import React, { useState } from 'react';
import { categoryService } from '../../../services/categoryService';
import './CategoryManager.css';

// Remove 'export' from here and add 'export default' at the bottom
const CategoryManager = ({
  title,
  description,
  categories,
  categoryType,
  showForm,
  setShowForm,
  newCategory,
  errors,
  loading,
  suggestions,
  onInputChange,
  onSubmit,
  onUpdate,
  placeholder
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleEdit = (category) => {
    setEditingId(category._id);
    setEditValue(category.name);
    setEditDescription(category.description || '');
  };

  const handleSaveEdit = async (categoryId) => {
    try {
      const result = await categoryService.updateCategory(categoryId, {
        name: editValue,
        description: editDescription
      });

      if (result.success) {
        setEditingId(null);
        setEditValue('');
        setEditDescription('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const result = await categoryService.deleteCategory(categoryId);
        if (result.success) {
          onUpdate();
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onInputChange('name', suggestion);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="category-manager">
      <div className="manager-header">
        <div className="header-info">
          <h3>{title}</h3>
         
        </div>
        <button
          className="add-category-btn"
          onClick={() => setShowForm(!showForm)}
        >
          <span>+</span>
          Add New
        </button>
      </div>

      {/* Add Category Form */}
      {showForm && (
        <div className="category-form">
          <h4>Add New {title}</h4>
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="categoryName">Category Name *</label>
              <input
                type="text"
                id="categoryName"
                value={newCategory.name}
                onChange={(e) => onInputChange('name', e.target.value)}
                placeholder={placeholder}
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
              
              {/* Quick Suggestions */}
              {suggestions && newCategory.name.length === 0 && (
                <div className="suggestions">
                  <span className="suggestions-label">Quick add:</span>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="categoryDescription">Description (Optional)</label>
              <textarea
                id="categoryDescription"
                value={newCategory.description}
                onChange={(e) => onInputChange('description', e.target.value)}
                placeholder="Enter a brief description..."
                rows="3"
                className={errors.description ? 'error' : ''}
              />
              {errors.description && <span className="error-message">{errors.description}</span>}
            </div>

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
                  onInputChange('name', '');
                  onInputChange('description', '');
                  setErrors({});
                }}
              >
                Cancel
              </button>
            </div>

            {errors.submit && (
              <div className="submit-error">{errors.submit}</div>
            )}
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="categories-list">
        <div className="list-header">
          <h4>Existing Categories ({categories.length})</h4>
          <div className="search-box">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h5>No categories found</h5>
            <p>
              {searchTerm ? 'Try adjusting your search terms' : `Get started by adding your first ${title.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="categories-grid">
            {filteredCategories.map((category) => (
              <div key={category._id} className="category-card">
                {editingId === category._id ? (
                  <div className="edit-mode">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="edit-input"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      rows="2"
                      className="edit-textarea"
                    />
                    <div className="edit-actions">
                      <button
                        onClick={() => handleSaveEdit(category._id)}
                        className="save-edit-btn"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="cancel-edit-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="view-mode">
                    <div className="category-content">
                      <h5 className="category-name">{category.name}</h5>
                      {category.description && (
                        <p className="category-description">{category.description}</p>
                      )}
                      <div className="category-meta">
                        <span className="created-date">
                          Added {new Date(category.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="category-actions">
                      <button
                        onClick={() => handleEdit(category)}
                        className="edit-btn"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="delete-btn"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Add this line at the bottom for default export
export default CategoryManager;