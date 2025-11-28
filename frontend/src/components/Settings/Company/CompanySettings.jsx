import React, { useState, useEffect } from 'react';
import {
  companyService,
  defaultCompanyInfo,
  currencyOptions,
  fiscalYearOptions
} from '../../../services/company';
import './CompanySettings.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';
 
const CompanySettings = () => {
  const [companyInfo, setCompanyInfo] = useState(defaultCompanyInfo);
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, signature: false });
 
  // Load company info from backend
  useEffect(() => {
    fetchCompanyInfo();
  }, []);
 
  const fetchCompanyInfo = async () => {
    try {
      setIsLoading(true);
      const result = await companyService.getCompanyInfo();
     
      if (result.success) {
        setCompanyInfo(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
      setSaveMessage('Error loading company information');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };
 
   const handleImageUpload = async (file, type) => {
    try {
      setUploading(prev => ({ ...prev, [type]: true }));
     
      const result = await companyService.uploadImage(file, type);
     
      if (result.success) {
        setCompanyInfo(result.data);
        setSaveMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      setSaveMessage(`Error uploading ${type}: ${error.message}`);
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };
 
    const handleImageDelete = async (type) => {
    try {
      const result = await companyService.deleteImage(type);
     
      if (result.success) {
        setCompanyInfo(result.data);
        setSaveMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      setSaveMessage(`Error deleting ${type}: ${error.message}`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };
 
    const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSaveMessage('Please select a valid image file');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
 
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSaveMessage('Image size should be less than 5MB');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }
 
      handleImageUpload(file, type);
    }
  };
 
  const validateForm = () => {
    const newErrors = companyService.validateCompanyData(companyInfo);
   
    // Add phone validation
    if (companyInfo.phone && !isValidPhoneNumber(companyInfo.phone)) {
      newErrors.phone = 'Please enter a valid phone number for the selected country';
    }
   
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
 
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
   
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
 
  // Handle phone number change
  const handlePhoneChange = (value) => {
    setCompanyInfo(prev => ({
      ...prev,
      phone: value
    }));
   
    // Clear phone error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({
        ...prev,
        phone: ''
      }));
    }
  };
 
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
   
    try {
      setIsSaving(true);
      const result = await companyService.updateCompanyInfo(companyInfo);
 
      if (result.success) {
        setIsEditing(false);
        setSaveMessage('Company information saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
       
        // Update local state with the saved data from server
        setCompanyInfo(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      setSaveMessage('Error saving company information: ' + error.message);
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };
 
  const handleCancel = () => {
    fetchCompanyInfo(); // Reload original data from server
    setIsEditing(false);
    setErrors({});
    setSaveMessage('');
  };
 
  if (isLoading) {
    return (
      <div className="company-settings">
        <div className="settings-layout">
          <div className="forms-section">
            <div className="loading-message">Loading company information...</div>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="company-settings">
      {saveMessage && (
        <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
          {saveMessage}
        </div>
      )}
 
      <div className="settings-layout">
        {/* Left Side - Form */}
        <div className="forms-section">
          <div className="company-info-card">
            <div className="card-header">
              <h3>Company Details</h3>
              {!isEditing && (
                <button
                  className="edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  <span className="edit-icon">✏️</span>
                  Edit Information
                </button>
              )}
            </div>
 
                        {/* Add Image Upload Sections */}
            <div className="image-upload-section">
              <div className="image-upload-group">
                <label>Company Logo</label>
                <div className="image-upload-container">
                  {companyInfo.logo?.url ? (
                    <div className="image-preview">
                      <img src={companyInfo.logo.url} alt="Company Logo" />
                      <button
                        type="button"
                        className="delete-image-btn"
                        onClick={() => handleImageDelete('logo')}
                        disabled={uploading.logo}
                      >
                        {uploading.logo ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'logo')}
                        disabled={uploading.logo}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="logo-upload" className="upload-btn">
                        {uploading.logo ? 'Uploading...' : 'Upload Logo'}
                      </label>
                      <small>Recommended: 300x300px, PNG or JPG</small>
                    </div>
                  )}
                </div>
              </div>
 
              <div className="image-upload-group">
                <label>Authorized Signature</label>
                <div className="image-upload-container">
                  {companyInfo.signature?.url ? (
                    <div className="image-preview">
                      <img src={companyInfo.signature.url} alt="Authorized Signature" />
                      <button
                        type="button"
                        className="delete-image-btn"
                        onClick={() => handleImageDelete('signature')}
                        disabled={uploading.signature}
                      >
                        {uploading.signature ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  ) : (
                    <div className="image-upload-placeholder">
                      <input
                        type="file"
                        id="signature-upload"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'signature')}
                        disabled={uploading.signature}
                        style={{ display: 'none' }}
                      />
                      <label htmlFor="signature-upload" className="upload-btn">
                        {uploading.signature ? 'Uploading...' : 'Upload Signature'}
                      </label>
                      <small>Recommended: 200x100px, PNG with transparent background</small>
                    </div>
                  )}
                </div>
              </div>
            </div>
 
            <div className="forms-grid">
              <div className="forms-group full-width">
                <label htmlFor="companyName">Company Name</label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={companyInfo.companyName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? 'disabled' : ''}
                  placeholder="Enter company name"
                />
              </div>
 
              <div className="forms-group full-width">
                <label htmlFor="address" className="required">
                  Company Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={companyInfo.address}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`${!isEditing ? 'disabled' : ''} ${errors.address ? 'error' : ''}`}
                  rows="3"
                  placeholder="Enter full company address"
                />
                {errors.address && <span className="error-message">{errors.address}</span>}
              </div>
 
              <div className="forms-group">
                <label htmlFor="phone">Phone Number</label>
                <div className="phone-input-container">
                  <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    defaultCountry="IN"
                    value={companyInfo.phone}
                    onChange={handlePhoneChange}
                    placeholder="Enter phone number"
                    disabled={!isEditing}
                    className={`customs-phone-input ${!isEditing ? 'disabled' : ''} ${errors.phone ? 'error' : ''}`}
                  />
                </div>
                {errors.phone && <span className="error-message">{errors.phone}</span>}
                <small style={{ color: '#64748b', marginTop: '4px', display: 'block' }}>
                  Select country code and enter phone number
                </small>
              </div>
 
              <div className="forms-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={companyInfo.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`${!isEditing ? 'disabled' : ''} ${errors.email ? 'error' : ''}`}
                  placeholder="contact@company.com"
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>
 
              <div className="forms-group">
                <label htmlFor="website">Website</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={companyInfo.website}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`${!isEditing ? 'disabled' : ''}`}
                  placeholder="https://www.company.com"
                />
              </div>
 
              <div className="forms-group">
                <label htmlFor="taxId">Tax ID / VAT Number</label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={companyInfo.taxId}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? 'disabled' : ''}
                  placeholder="TAX-123456789"
                />
              </div>
 
              <div className="forms-group">
                <label htmlFor="currency">Default Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={companyInfo.currency}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? 'disabled' : ''}
                >
                  {currencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
 
              <div className="forms-group">
                <label htmlFor="fiscalYear">Fiscal Year Start</label>
                <select
                  id="fiscalYear"
                  name="fiscalYear"
                  value={companyInfo.fiscalYear}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={!isEditing ? 'disabled' : ''}
                >
                  {fiscalYearOptions.map(month => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
 
            {isEditing && (
              <div className="action-buttons">
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <span className="save-icon">💾</span>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="cancel-btn"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
 
        {/* Right Side - Preview */}
        <div className="preview-section">
          <div className="preview-card">
            <div className="preview-header">
              <h3>Company Information Preview</h3>
              <div className="preview-badge">Live Preview</div>
            </div>
            <div className="preview-content">
 
              {companyInfo.logo?.url && (
                <div className="preview-item full-width">
                  <span className="preview-label">Company Logo:</span>
                  <div className="preview-image">
                    <img src={companyInfo.logo.url} alt="Company Logo Preview" />
                  </div>
                </div>
              )}
 
            {/* Signature Preview */}
              {companyInfo.signature?.url && (
                <div className="preview-item full-width">
                  <span className="preview-label">Signature:</span>
                  <div className="preview-image">
                    <img src={companyInfo.signature.url} alt="Signature Preview" />
                  </div>
                </div>
              )}
 
              <div className="preview-item">
                <span className="preview-label">Company Name:</span>
                <span className="preview-value">{companyInfo.companyName || <span className="missing-info">Not provided</span>}</span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Address:</span>
                <span className="preview-value">
                  {companyInfo.address || <span className="missing-info">Not provided</span>}
                </span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Phone:</span>
                <span className="preview-value">
                  {companyInfo.phone || <span className="missing-info">Not provided</span>}
                </span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Email:</span>
                <span className="preview-value">
                  {companyInfo.email || <span className="missing-info">Not provided</span>}
                </span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Website:</span>
                <span className="preview-value">
                  {companyInfo.website || <span className="missing-info">Not provided</span>}
                </span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Tax ID:</span>
                <span className="preview-value">
                  {companyInfo.taxId || <span className="missing-info">Not provided</span>}
                </span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Currency:</span>
                <span className="preview-value">{companyInfo.currency}</span>
              </div>
             
              <div className="preview-item">
                <span className="preview-label">Fiscal Year:</span>
                <span className="preview-value">Starts in {companyInfo.fiscalYear}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default CompanySettings;
 