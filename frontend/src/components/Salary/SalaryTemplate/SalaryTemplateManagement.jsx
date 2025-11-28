import React, { useState, useEffect } from 'react';
import { salaryTemplateService } from '../../../services/salaryTemplate';
import './SalaryTemplateManagement.css';
import '../SalaryManagement.css';

const SalaryTemplateManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState(null);
  const [showTemplateDetail, setShowTemplateDetail] = useState(false);

  // NEW: State for dynamic designations
  const [designations, setDesignations] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [formData, setFormData] = useState({
    designation: '',
    basicSalary: '',
    remainingLeaves: 12,
    earnings: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
    deductions: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }]
  });

  const [calculatedValues, setCalculatedValues] = useState({
    grossEarnings: 0,
    totalDeductions: 0,
    netPay: 0
  });

  useEffect(() => {
    loadTemplates();
    loadDesignations(); // Load designations when component mounts
  }, []);

  // NEW: Load designations from backend
  const loadDesignations = async () => {
    setCategoriesLoading(true);
    try {
      const designationsData = await salaryTemplateService.getEmployeeDesignations();
      
      if (designationsData.success) {
        setDesignations(designationsData.data || []);
      } else {
        // Fallback to default values if API fails
        setDesignations([
          { name: 'Junior Developer' },
          { name: 'Senior Developer' },
          { name: 'Team Lead' },
          { name: 'Project Manager' },
          { name: 'UI/UX Designer' },
          { name: 'QA Engineer' },
          { name: 'DevOps Engineer' },
          { name: 'System Analyst' },
          { name: 'Technical Architect' },
          { name: 'Product Manager' }
        ]);
      }
    } catch (error) {
      console.error('Error loading designations:', error);
      // Fallback to default values if API fails
      setDesignations([
        { name: 'Junior Developer' },
        { name: 'Senior Developer' },
        { name: 'Team Lead' },
        { name: 'Project Manager' },
        { name: 'UI/UX Designer' },
        { name: 'QA Engineer' },
        { name: 'DevOps Engineer' },
        { name: 'System Analyst' },
        { name: 'Technical Architect' },
        { name: 'Product Manager' }
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Calculate values when form data changes
  useEffect(() => {
    if (!showTemplateForm) return;

    const calculateAllValues = () => {
      const basicSalary = parseFloat(formData.basicSalary) || 0;
      
      // Calculate earnings with percentages
      const updatedEarnings = formData.earnings.map(earning => {
        if (earning.calculationType === 'percentage' && earning.percentage > 0) {
          return {
            ...earning,
            amount: Math.round((basicSalary * parseFloat(earning.percentage)) / 100)
          };
        }
        return earning;
      });

      // Calculate deductions with percentages
      const updatedDeductions = formData.deductions.map(deduction => {
        if (deduction.calculationType === 'percentage' && deduction.percentage > 0) {
          return {
            ...deduction,
            amount: Math.round((basicSalary * parseFloat(deduction.percentage)) / 100)
          };
        }
        return deduction;
      });

      // Calculate totals
      const grossEarnings = updatedEarnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0);
      const totalDeductions = updatedDeductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0);
      const netPay = grossEarnings - totalDeductions;

      setCalculatedValues({
        grossEarnings,
        totalDeductions,
        netPay
      });

      // Update form data with calculated values
      setFormData(prev => ({
        ...prev,
        earnings: updatedEarnings,
        deductions: updatedDeductions
      }));
    };

    calculateAllValues();
  }, [showTemplateForm, formData.basicSalary]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await salaryTemplateService.getSalaryTemplates();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Error loading salary templates:', error);
      alert('Error loading salary templates');
    } finally {
      setLoading(false);
    }
  };

  const handleEarningChange = (index, field, value) => {
    const updatedEarnings = [...formData.earnings];
   
    if (field === 'percentage') {
      updatedEarnings[index][field] = value;
      if (value && parseFloat(value) > 0) {
        const basicSalary = parseFloat(formData.basicSalary) || 0;
        updatedEarnings[index].amount = Math.round((basicSalary * parseFloat(value)) / 100);
        updatedEarnings[index].calculationType = 'percentage';
      } else {
        updatedEarnings[index].calculationType = 'amount';
      }
    } else if (field === 'amount') {
      updatedEarnings[index][field] = Math.round(parseFloat(value)) || 0;
      if (value && parseFloat(value) > 0) {
        updatedEarnings[index].percentage = '';
        updatedEarnings[index].calculationType = 'amount';
      }
    } else {
      updatedEarnings[index][field] = value;
    }
   
    setFormData(prev => ({ ...prev, earnings: updatedEarnings }));
  };

  const handleDeductionChange = (index, field, value) => {
    const updatedDeductions = [...formData.deductions];
   
    if (field === 'percentage') {
      updatedDeductions[index][field] = value;
      if (value && parseFloat(value) > 0) {
        const basicSalary = parseFloat(formData.basicSalary) || 0;
        updatedDeductions[index].amount = Math.round((basicSalary * parseFloat(value)) / 100);
        updatedDeductions[index].calculationType = 'percentage';
      } else {
        updatedDeductions[index].calculationType = 'amount';
      }
    } else if (field === 'amount') {
      updatedDeductions[index][field] = Math.round(parseFloat(value)) || 0;
      if (value && parseFloat(value) > 0) {
        updatedDeductions[index].percentage = '';
        updatedDeductions[index].calculationType = 'amount';
      }
    } else {
      updatedDeductions[index][field] = value;
    }
   
    setFormData(prev => ({ ...prev, deductions: updatedDeductions }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addEarning = () => {
    setFormData(prev => ({
      ...prev,
      earnings: [...prev.earnings, { type: '', amount: 0, percentage: '', calculationType: 'amount' }]
    }));
  };

  const removeEarning = (index) => {
    if (formData.earnings.length > 1) {
      setFormData(prev => ({
        ...prev,
        earnings: prev.earnings.filter((_, i) => i !== index)
      }));
    }
  };

  const addDeduction = () => {
    setFormData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { type: '', amount: 0, percentage: '', calculationType: 'amount' }]
    }));
  };

  const removeDeduction = (index) => {
    if (formData.deductions.length > 1) {
      setFormData(prev => ({
        ...prev,
        deductions: prev.deductions.filter((_, i) => i !== index)
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      designation: '',
      basicSalary: '',
      remainingLeaves: 12,
      earnings: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      deductions: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }]
    });
    setEditingTemplate(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
       if (!designations.some(d => d.name === formData.designation)) {
        alert('Please select a valid designation from the list');
        setLoading(false);
        return;
      }
      // Round all amounts before submitting
      const submitData = {
        ...formData,
        basicSalary: parseFloat(formData.basicSalary),
        earnings: formData.earnings.map(earning => ({
          ...earning,
          amount: Math.round(parseFloat(earning.amount) || 0)
        })),
        deductions: formData.deductions.map(deduction => ({
          ...deduction,
          amount: Math.round(parseFloat(deduction.amount) || 0)
        }))
      };

      if (editingTemplate) {
        await salaryTemplateService.updateSalaryTemplate(editingTemplate._id, submitData);
        alert('Salary template updated successfully!');
      } else {
        await salaryTemplateService.createSalaryTemplate(submitData);
        alert('Salary template created successfully!');
      }
     
      setShowTemplateForm(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      alert(error.response?.data?.message || `Error ${editingTemplate ? 'updating' : 'creating'} salary template`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTemplate = (template) => {
    setFormData({
      designation: template.designation,
      basicSalary: template.basicSalary,
      remainingLeaves: template.remainingLeaves || 12,
      earnings: template.earnings.length > 0 ? template.earnings : [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      deductions: template.deductions.length > 0 ? template.deductions : [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }]
    });
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (window.confirm('Are you sure you want to delete this salary template?')) {
      try {
        await salaryTemplateService.deleteSalaryTemplate(templateId);
        loadTemplates();
        alert('Salary template deleted successfully!');
      } catch (error) {
        alert('Error deleting salary template');
      }
    }
  };

  const handleTemplateDetail = (template) => {
    setSelectedTemplateDetail(template);
    setShowTemplateDetail(true);
  };

  const handleStatusChange = async (templateId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    if (window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this template?`)) {
      try {
        await salaryTemplateService.updateTemplateStatus(templateId, newStatus);
        loadTemplates();
        alert(`Template ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      } catch (error) {
        alert('Error updating template status');
      }
    }
  };

  const openAddForm = () => {
    resetForm();
    setShowTemplateForm(true);
  };

  const filteredTemplates = templates.filter(template => {
    if (!searchTerm) return true;
   
    const searchLower = searchTerm.toLowerCase();
    return (
      (template.designation && template.designation.toLowerCase().includes(searchLower)) ||
      (template.basicSalary && template.basicSalary.toString().includes(searchTerm))
    );
  });

  const roundAmount = (amount) => {
    return Math.round(parseFloat(amount) || 0);
  };

  // Fixed salary summary calculations with rounding
  const totalEarnings = roundAmount(formData.earnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0));
  const totalDeductions = roundAmount(formData.deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0));
  const grossEarnings = roundAmount(totalEarnings);
  const netPay = roundAmount(grossEarnings - totalDeductions);
 
  // Calculate totals for selected salary detail
  const selectedTotalEarnings = selectedTemplateDetail ? roundAmount(selectedTemplateDetail.earnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0)) : 0;
  const selectedTotalDeductions = selectedTemplateDetail ? roundAmount(selectedTemplateDetail.deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0)) : 0;
  const selectedGrossEarnings = selectedTemplateDetail ? roundAmount(selectedTotalEarnings) : 0;
  const selectedNetPay = selectedTemplateDetail ? roundAmount((selectedGrossEarnings - selectedTotalDeductions)) : 0;
 
  

  return (
    <div className="salary-template-management">
      {/* Header with Stats */}
      <div className="salary-header">
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{templates.length}</div>
            <div className="stat-label">Total Templates</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {templates.filter(t => t.status === 'active').length}
            </div>
            <div className="stat-label">Active Templates</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {templates.filter(t => t.status === 'inactive').length}
            </div>
            <div className="stat-label">Inactive Templates</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {designations.length}
            </div>
            <div className="stat-label">Available Roles</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by designation or salary..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="controls-buttons">
          <button className="add-salary-btn" onClick={openAddForm}>
            <span>+</span>
            Add Salary Template
          </button>
        </div>
      </div>

      {/* Templates Table */}
      <div className="salary-table-container">
        {loading ? (
          <div className="table-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="table-row loading-shimmer" style={{height: '60px'}}></div>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="no-records">
            <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
              <h3>No salary templates found</h3>
              <p>{searchTerm ? 'Try adjusting your search terms' : 'No salary templates available. Create your first template!'}</p>
            </div>
          </div>
        ) : (
          <div className="salary-list-container">
            <div className="table-container">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Designation</th>
                    <th>Basic Salary</th>
                    <th>Remaining Leaves</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template._id}
                      className="salary-table-row"
                      onClick={() => handleTemplateDetail(template)}
                    >
                      <td>
                        <div className="employee-cell">
                          <div className="employee-details">
                            <div className="employee-name">{template.designation}</div>
                            <div className="employee-designation">
                              {template.earnings.length} earnings, {template.deductions.length} deductions
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="currency">Rs.{template.basicSalary?.toFixed(2)}</span>
                      </td>
                      <td>
                        <span>{template.remainingLeaves}</span>
                      </td>
                      <td>
                        <span className={`status-badge status-${template.status}`}>
                          {template.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                          {/* <button
                            className="action-btns primary"
                            onClick={() => handleTemplateDetail(template)}
                            title="View Details"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button> */}
                          <button
                            className="action-btns"
                            onClick={() => handleEditTemplate(template)}
                            title="Edit Template"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button

                          className={`action-btns ${template.status === 'active' ? 'warning' : 'success'}`}

                          onClick={() => handleStatusChange(template._id, template.status)}

                          title={template.status === 'active' ? 'Deactivate' : 'Activate'}
                        >

                          {template.status === 'active' ? (

                            // ❌ Cross Icon (Deactivate)
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>

                          ) : (

                            // ✔️ Tick Icon (Activate)
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                        </svg>

                          )}
                        </button>
 
                          <button
                            className="action-btns danger"
                            onClick={() => handleDeleteTemplate(template._id)}
                            title="Delete Template"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {showTemplateDetail && selectedTemplateDetail && (
        <div className="modals-overlay" onClick={() => setShowTemplateDetail(false)}>
          <div className="modal-content large-modals" onClick={(e) => e.stopPropagation()}>
            <div className="modals-header">
              <h3>Salary Template Details - {selectedTemplateDetail.designation}</h3>
              <button className="close-btn" onClick={() => setShowTemplateDetail(false)}>×</button>
            </div>
            <div className="modals-body">
              <div className="salary-detail-container">
                {/* Template Information */}
                <div className="detail-section">
                  <h4 className="section-title">Template Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Designation:</span>
                      <span className="detail-value">{selectedTemplateDetail.designation}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Basic Salary:</span>
                      <span className="detail-value currency">Rs.{selectedTemplateDetail.basicSalary?.toFixed(2)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Remaining Leaves:</span>
                      <span className="detail-value">{selectedTemplateDetail.remainingLeaves}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge status-${selectedTemplateDetail.status}`}>
                        {selectedTemplateDetail.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown */}
                <div className="detail-section">
                  <h4 className="section-title">Salary Breakdown</h4>
                  <div className="breakdown-grid">
                    <div className="breakdown-column">
                      <h5>Earnings</h5>
                      <div className="breakdown-items">
                        {/* <div className="breakdown-item">
                          <span>Basic Salary:</span>
                          <span className="currency">Rs.{selectedTemplateDetail.basicSalary?.toFixed(2)}</span>
                        </div> */}
                        {selectedTemplateDetail.earnings?.map((earning, index) => (
                          <div key={index} className="breakdown-item">
                            <span>{earning.type || 'Additional Earning'}:</span>
                            <span className="currency">Rs.{earning.amount?.toFixed(2)}</span>
                            {/* {earning.percentage && (
                              <span className="percentage-badge">({earning.percentage}%)</span>
                            )} */}
                          </div>
                        ))}
                        <div className="breakdown-total">
                          <span>Total Earnings:</span>
                          <span className="currency">Rs.{selectedGrossEarnings.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                   
                    <div className="breakdown-column">
                      <h5>Deductions</h5>
                      <div className="breakdown-items">
                        {selectedTemplateDetail.deductions?.map((deduction, index) => (
                          <div key={index} className="breakdown-item">
                            <span>{deduction.type || 'Deduction'}:</span>
                            <span className="currency">Rs.{deduction.amount?.toFixed(2)}</span>
                            {/* {deduction.percentage && (
                              <span className="percentage-badge">({deduction.percentage}%)</span>
                            )} */}
                          </div>
                        ))}
                        <div className="breakdown-total">
                          <span>Total Deductions:</span>
                          <span className="currency">Rs.{selectedTotalDeductions.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                 
                  {/* Net Pay Summary */}
                  <div className="net-pay-summary">
                    <div className="net-pay-item">
                      <span className="net-pay-label">Net Pay:</span>
                      <span className="net-pay-amount currency currency-large">Rs.{selectedNetPay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="detail-actions">
                  <button
                    className="action-btns primary"
                    onClick={() => {
                      setShowTemplateDetail(false);
                      handleEditTemplate(selectedTemplateDetail);
                    }}
                  >
                    Edit Template
                  </button>
                  <button
                    className="action-btns"
                    onClick={() => setShowTemplateDetail(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Template Form Modal */}
      {showTemplateForm && (
        <div className="modals-overlay" onClick={() => setShowTemplateForm(false)}>
          <div className="modal-content large-modals" onClick={(e) => e.stopPropagation()}>
            <div className="modals-header">
              <h3>{editingTemplate ? 'Edit Salary Template' : 'Add Salary Template'}</h3>
              <button className="close-btn" onClick={() => setShowTemplateForm(false)}>×</button>
            </div>
            <div className="modals-body">
              <form onSubmit={handleSubmit} className="salary-form">
                <div className="form-sections">
                  {/* Template Information */}
                  <div className="form-section">
                    <h4 className="section-title">Template Information</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Designation *</label>
                        <select
                          className="form-select"
                          name="designation"
                          value={formData.designation}
                          onChange={handleInputChange}
                          required
                          disabled={!!editingTemplate ||categoriesLoading}
                        >
                         <option value="">{categoriesLoading ? 'Loading designations...' : 'Select Designation'}</option>
                          {designations.map((category, index) => (
                            <option key={index} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        <small className="form-help">
                          {editingTemplate ? 'Designation cannot be changed' : 'Select the role/designation for this template'}
                        </small>
                              {categoriesLoading && (
                          <small style={{ color: '#64748b' }}>Loading designations...</small>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Basic Salary (Monthly) *</label>
                        <input
                          type="number"
                          className="form-input"
                          name="basicSalary"
                          value={formData.basicSalary}
                          onChange={handleInputChange}
                          required
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Remaining Leaves</label>
                        <input
                          type="number"
                          className="form-input"
                          name="remainingLeaves"
                          value={formData.remainingLeaves}
                          onChange={handleInputChange}
                          min="0"
                          max="31"
                        />
                        <small className="form-help">Default remaining leaves for new employees</small>
                      </div>
                    </div>
                  </div>

                  {/* Additional Earnings */}
                  <div className="form-section">
                    <div className="section-header">
                      <h4 className="section-title">Additional Earnings</h4>
                      <button type="button" onClick={addEarning} className="add-item">
                        + Add Earning
                      </button>
                    </div>
                    <div className="dynamic-items">
                      {formData.earnings.map((earning, index) => (
                        <div key={index} className="item-row">
                          <div className="weform-group">
                            <label className="form-label">Type</label>
                            <input
                              type="text"
                              className="form-input"
                              value={earning.type}
                              onChange={(e) => handleEarningChange(index, 'type', e.target.value)}
                              placeholder="Earning type (e.g., HRA, Travel Allowance)"
                            />
                          </div>
                          <div className="weform-group">
                            <label className="form-label">Percentage (%)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={earning.percentage}
                              onChange={(e) => handleEarningChange(index, 'percentage', e.target.value)}
                              placeholder="Percentage"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="weform-group">
                            <label className="form-label">Amount</label>
                            <input
                              type="number"
                              className="form-input"
                              value={earning.amount}
                              onChange={(e) => handleEarningChange(index, 'amount', e.target.value)}
                              placeholder="Amount"
                              step="0.01"
                              disabled={earning.calculationType === 'percentage'}
                            />
                          </div>
                          {formData.earnings.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEarning(index)}
                              className="remove-item"
                              title="Remove Earning"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="form-section">
                    <div className="section-header">
                      <h4 className="section-title">Deductions</h4>
                      <button type="button" onClick={addDeduction} className="add-item">
                        + Add Deduction
                      </button>
                    </div>
                    <div className="dynamic-items">
                      {formData.deductions.map((deduction, index) => (
                        <div key={index} className="item-row">
                          <div className="weform-group">
                            <label className="form-label">Type</label>
                            <input
                              type="text"
                              className="form-input"
                              value={deduction.type}
                              onChange={(e) => handleDeductionChange(index, 'type', e.target.value)}
                              placeholder="Deduction type (e.g., PF, Professional Tax)"
                            />
                          </div>
                          <div className="weform-group">
                            <label className="form-label">Percentage (%)</label>
                            <input
                              type="number"
                              className="form-input"
                              value={deduction.percentage}
                              onChange={(e) => handleDeductionChange(index, 'percentage', e.target.value)}
                              placeholder="Percentage"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="weform-group">
                            <label className="form-label">Amount</label>
                            <input
                              type="number"
                              className="form-input"
                              value={deduction.amount}
                              onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                              placeholder="Amount"
                              step="0.01"
                              disabled={deduction.calculationType === 'percentage'}
                            />
                          </div>
                          {formData.deductions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDeduction(index)}
                              className="remove-item"
                              title="Remove Deduction"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Salary Summary */}
                  <div className="form-section">
                    <h4 className="section-title">Salary Summary</h4>
                    <div className="summary-table">
                      <div className="summary-table-row">
                        <span className="summary-table-label">Basic Salary:</span>
                        <span className="summary-table-value">Rs.{formData.basicSalary ? parseFloat(formData.basicSalary).toFixed(2) : '0.00'}</span>
                      </div>
                      <div className="summary-table-row total">
                        <span className="summary-table-label">Gross Earnings:</span>
                        <span className="summary-table-value">Rs.{grossEarnings.toFixed(2)}</span>
                      </div>
                      <div className="summary-table-row">
                        <span className="summary-table-label">Total Deductions:</span>
                        <span className="summary-table-value">Rs.{totalDeductions.toFixed(2)}</span>
                      </div>
                      <div className="summary-table-row net">
                        <span className="summary-table-label">Net Pay:</span>
                        <span className="summary-table-value">Rs.{netPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => setShowTemplateForm(false)}
                      className="action-btns"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="action-btns primary"
                    >
                      {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Create Template')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTemplateManagement;