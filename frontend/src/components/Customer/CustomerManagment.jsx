import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customer';
import './CustomerManagment.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';

const CustomerManagment = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [phoneError, setPhoneError] = useState('');
  const [paymentTermsError, setPaymentTermsError] = useState('');
 const [emailError, setEmailError] = useState(''); // NEW: Email validation error state
  const [checkingEmail, setCheckingEmail] = useState(false); // NEW: Loading state for email check
  // Form state with proper default values
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    customerType: 'individual',
    paymentTerms: 30 // Default to 30 days as number
  });

  // Payment terms display function
  const getPaymentTermsDisplay = (terms) => {
    if (terms === 0) return 'Due on receipt';
    if (terms === 1) return 'Net 1 day';
    return `Net ${terms} days`;
  };

   // NEW: Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // NEW: Function to check if email already exists
  const checkEmailExists = async (email) => {
    if (!email || !isValidEmail(email)) {
      setEmailError('');
      return false;
    }

    // For update: if email hasn't changed, no need to check
    if (editingCustomer && email === editingCustomer.email) {
      setEmailError('');
      return false;
    }

    setCheckingEmail(true);
    try {
      // Check in existing customers list first (client-side cache)
      const existingCustomer = customers.find(cust => 
        cust.email.toLowerCase() === email.toLowerCase() && 
        (!editingCustomer || cust._id !== editingCustomer._id) // Exclude current customer for updates
      );
      
      if (existingCustomer) {
        setEmailError('Customer with this email already exists');
        return true;
      }

      // Note: We can't check User collection from frontend for security reasons
      // The backend will handle the User collection check and return appropriate error
      setEmailError('');
      return false;
      
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailError('');
      return false;
    } finally {
      setCheckingEmail(false);
    }
  };

  // Fetch customers from MongoDB
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await customerService.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error fetching customers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Convert paymentTerms to number
    if (name === 'paymentTerms') {
      const numValue = value === '' ? '' : Number(value);
      setForm({ ...form, [name]: numValue });
      
      // Validate payment terms
      // if (value === '') {
      //   setPaymentTermsError('Payment terms is required');
      if (numValue < 0 || numValue > 365) {
        setPaymentTermsError('Payment terms must be between 0 and 365 days');
      } else {
        setPaymentTermsError('');
      }
    } else if (name === 'email') {
      setForm({ ...form, [name]: value });

      // Real-time email validation with debounce
      if (value) {
        if (!isValidEmail(value)) {
          setEmailError('Please enter a valid email address');
        } else {
          // For update: check if email is different from current
          const isUpdate = !!editingCustomer;
          const currentEmail = editingCustomer?.email || '';
          
          if (isUpdate && value === currentEmail) {
            // If email hasn't changed, no need to check for duplicates
            setEmailError('');
          } else {
            // Clear previous error and check if email exists
            setEmailError('');
            // Add a small delay to avoid too many API calls
            const timer = setTimeout(() => {
              checkEmailExists(value);
            }, 500);
            return () => clearTimeout(timer);
          }
        }
      } else {
        setEmailError('Email is required');
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };


  // Phone validation function
  const validatePhoneNumber = (phone) => {
    if (!phone) {
      setPhoneError('Phone number is required');
      return false;
    }
    
    if (!isValidPhoneNumber(phone)) {
      setPhoneError('Please enter a valid phone number for the selected country');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  // Validate payment terms
  const validatePaymentTerms = (paymentTerms) => {
    // if (paymentTerms === '' || paymentTerms === null || paymentTerms === undefined) {
    //   setPaymentTermsError('Payment terms is required');
    //   return false;
    // }
    
    const terms = Number(paymentTerms);
    if (isNaN(terms)) {
      setPaymentTermsError('Payment terms must be a number');
      return false;
    }
    
    if (terms < 0 || terms > 365) {
      setPaymentTermsError('Payment terms must be between 0 and 365 days');
      return false;
    }
    
    setPaymentTermsError('');
    return true;
  };

  // Handle phone number change
  const handlePhoneChange = (value) => {
    setForm({
      ...form,
      phone: value
    });
    
    // Real-time phone validation
    if (value) {
      if (!isValidPhoneNumber(value)) {
        setPhoneError('Please enter a valid phone number for the selected country');
      } else {
        setPhoneError('');
      }
    } else {
      setPhoneError('Phone number is required');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
   
    try {
      // Validate phone number
      if (!validatePhoneNumber(form.phone)) {
        setLoading(false);
        return;
      }

      // Validate payment terms
      if (!validatePaymentTerms(form.paymentTerms)) {
        setLoading(false);
        return;
      }
      // Validate email format
      if (!isValidEmail(form.email)) {
        setEmailError('Please enter a valid email address');
        setLoading(false);
        return;
      }
 // Check if email already exists (final check before submission)
      const emailExists = await checkEmailExists(form.email);
      if (emailExists) {
        setLoading(false);
        return;
      }


      // Prepare data for submission
      const submitData = {
        ...form,
        paymentTerms: form.paymentTerms === '' ? 30 : Number(form.paymentTerms)
      };

      if (editingCustomer) {
        // Update existing customer
        await customerService.updateCustomer(editingCustomer._id, submitData);
        alert('Customer updated successfully!');
      } else {
        // Add new customer
        await customerService.createCustomer(submitData);
        alert('Customer added successfully!');
      }
     
      // Refresh customers list
      await fetchCustomers();
     
      // Reset form
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: '',
        customerType: 'individual',
        paymentTerms: 30
      });
      setShowAddForm(false);
      setEditingCustomer(null);
      setPhoneError('');
      setPaymentTermsError('');
      setEmailError('');
    } catch (error) {
      console.error('Error saving customer:', error);
      
      // Handle specific email duplicate errors from backend
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;

        // Handle email duplicate errors
        if (errorMessage.includes('email') || errorMessage.includes('Email')) {
          if (errorMessage.includes('already exists in the system')) {
            setEmailError('Email already exists in the system (may belong to an admin or employee)');
          } else if (errorMessage.includes('Customer with this email already exists')) {
            setEmailError('Customer with this email already exists');
          } else {
            setEmailError('Email already exists');
          }
        } else {
          alert('Error saving customer: ' + errorMessage);
        }
      } else {
        alert('Error saving customer: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = (customer) => {
    setForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      company: customer.company || '',
      customerType: customer.customerType || 'individual',
      paymentTerms: customer.paymentTerms || 30
    });
    setEditingCustomer(customer);
    setPhoneError('');
    setPaymentTermsError('');
    setEmailError('');
    setShowAddForm(true);
  };

  const handleStatusChange = async (customerId, currentStatus, newStatus) => {
    const confirmationMessage = `Are you sure you want to change the status from ${currentStatus} to ${newStatus}?`;
   
    if (window.confirm(confirmationMessage)) {
      try {
        await customerService.updateCustomerStatus(customerId, newStatus);
        await fetchCustomers();
       
        // Auto-switch tabs based on new status
        if (newStatus === 'active') {
          setActiveTab('active');
        } else {
          setActiveTab('inactive');
        }
      } catch (error) {
        alert('Error updating customer status: ' + error.message);
      }
    }
  };

  const handleCancel = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      customerType: 'individual',
      paymentTerms: 30
    });
    setShowAddForm(false);
    setEditingCustomer(null);
    setPhoneError('');
    setPaymentTermsError('');
    setEmailError('');
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  // Filter customers based on active tab
  const statusFilteredCustomers = filteredCustomers.filter(customer =>
    activeTab === 'active'
      ? customer.status === 'active' || !customer.status
      : customer.status === 'inactive'
  );

  const activeCustomers = customers.filter(c => c.status === 'active' || !c.status).length;
  const inactiveCustomers = customers.filter(c => c.status === 'inactive').length;
  const corporateCustomers = customers.filter(c => c.customerType === 'corporate').length;

  return (
    <div className="customer-management-container">
      {/* Stats Cards */}
      <div className="customer-stats-grid">
        <div className="customer-stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          </div>
          <div className="stat-content">
            <h3>Total Customers</h3>
            <span className="stat-number">{customers.length}</span>
          </div>
        </div>
       
        <div className="customer-stat-card">
          <div className="stat-icon">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          </div>
          <div className="stat-content">
            <h3>Active Customers</h3>
            <span className="stat-number">{activeCustomers}</span>
          </div>
        </div>
       
        <div className="customer-stat-card">
          <div className="stat-icon">
            <svg fill="#000000" width="800px" height="800px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M604.16 788.48H419.84V947.2c0 14.138-11.462 25.6-25.6 25.6s-25.6-11.462-25.6-25.6V762.88c0-14.138 11.462-25.6 25.6-25.6h235.52c14.138 0 25.6 11.462 25.6 25.6V947.2c0 14.138-11.462 25.6-25.6 25.6s-25.6-11.462-25.6-25.6V788.48zm385.033 130.041c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6h-80.475c-14.138 0-25.6-11.462-25.6-25.6V347.279a5.12 5.12 0 00-5.12-5.12H530.98c-25.449 0-46.08-20.631-46.08-46.08V123.205a5.12 5.12 0 00-5.12-5.12H141.694a5.12 5.12 0 00-5.12 5.12V946.48c0 14.138-11.462 25.6-25.6 25.6H27.521c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6h57.853V123.205c0-31.105 25.215-56.32 56.32-56.32H479.78c31.105 0 56.32 25.215 56.32 56.32v167.754h341.898c31.105 0 56.32 25.215 56.32 56.32v571.242h54.875zM220.16 174.08h184.32c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6H220.16c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm0 112.64h184.32c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6H220.16c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm0 112.64h583.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6H220.16c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm0 112.64h583.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6H220.16c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm0 112.64h583.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6H220.16c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm0 112.64h71.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6h-71.68c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm512 0h71.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6h-71.68c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm-512 122.88h71.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6h-71.68c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6zm512 0h71.68c14.138 0 25.6 11.462 25.6 25.6s-11.462 25.6-25.6 25.6h-71.68c-14.138 0-25.6-11.462-25.6-25.6s11.462-25.6 25.6-25.6z"/></svg>
          </div>
          <div className="stat-content">
            <h3>Corporate Clients</h3>
            <span className="stat-number">{corporateCustomers}</span>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="customer-actions-section">
        <div className="search-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search customers by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="action-buttons-header">
            <button
              className="add-customer-btn"
              onClick={() => setShowAddForm(true)}
            >
              <span className="btn-icon">+</span>
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Customer Form */}
      {showAddForm && (
        <div className="customer-forme-modal">
          <div className="customer-forme-card">
            <div className="forme-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="close-btn" onClick={handleCancel}>×</button>
            </div>
           
            <form onSubmit={handleSubmit} className="customer-forme">
              <div className="forme-grid">
                <div className="forme-group">
                  <label>Contact Person *</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter contact person name"
                    required
                  />
                </div>
               
                <div className="forme-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    required
                  className={emailError ? 'invalid-input' : ''}
                  />
                  {emailError && (
                    <small className="error-text" style={{ color: '#dc2626', marginTop: '4px' }}>
                      {emailError}
                      {checkingEmail && ' (checking...)'}
                    </small>
                  )}
                  {!emailError && form.email && isValidEmail(form.email) && (
                    <small style={{ color: '#16a34a', marginTop: '4px' }}>
                      ✓ Email format is valid
                    </small>
                  )}
                </div>

                <div className="forme-group">
                  <label>Phone Number *</label>
                  <div className="phone-input-container">
                    <PhoneInput
                      international
                      countryCallingCodeEditable={false}
                      defaultCountry="IN"
                      value={form.phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone number"
                      className={`customer-phone-input ${phoneError ? 'invalid-input' : ''}`}
                    />
                  </div>
                  {phoneError && (
                    <small className="error-text" style={{ color: '#dc2626', marginTop: '4px' }}>
                      {phoneError}
                    </small>
                  )}
                  <small style={{ color: '#64748b', marginTop: phoneError ? '2px' : '6px' }}>
                    Select country code and enter phone number
                  </small>
                </div>
               
                <div className="forme-group">
                  <label>Customer Type</label>
                  <select
                    name="customerType"
                    value={form.customerType}
                    onChange={handleChange}
                  >
                    <option value="individual">Individual</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
               
                <div className="forme-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="forme-group">
                  <label>Payment Terms (Days) *</label>
                  <input
                    type="number"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleChange}
                    placeholder="Enter payment terms in days"
                    min="1"
                    max="365"
                    // required
                  />
                  {paymentTermsError && (
                    <small className="error-text" style={{ color: '#dc2626', marginTop: '4px' }}>
                      {paymentTermsError}
                    </small>
                  )}
                  <small style={{ color: '#64748b', marginTop: paymentTermsError ? '2px' : '6px' }}>
                    Number of days for payment (1-365).
                  </small>
                </div>
               
                <div className="forme-group full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter full address"
                    rows="3"
                  />
                </div>
              </div>
             
              <div className="forme-actions">
                <button type="button" className="cancel-btn" onClick={handleCancel}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={loading || phoneError || paymentTermsError|| emailError || !form.email}
                >
                  {loading ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Add Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Customers Table with Embedded Tabs */}
      <div className="customers-table-section">
        {/* Tab Navigation - Embedded in table card */}
        <div className="table-card-header">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Customers
            </button>
            <button
              className={`tab-button ${activeTab === 'inactive' ? 'active' : ''}`}
              onClick={() => setActiveTab('inactive')}
            >
              Inactive Customers
            </button>
          </div>
        </div>
       
        <div className="table-header">
          <h2>Customer List ({statusFilteredCustomers.length})</h2>
        </div>
       
        <div className="customers-table-container">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Contact Person</th>
                <th>Contact Info</th>
                <th>Company</th>
                <th>Type</th>
                <th>Payment Terms</th>
                <th>Join Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    Loading customers...
                  </td>
                </tr>
              ) : statusFilteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    No {activeTab === 'active' ? 'active' : 'inactive'} customers found
                  </td>
                </tr>
              ) : (
                statusFilteredCustomers.map(customer => (
                  <tr key={customer._id} className="customer-row">
                    <td>
                      <div className="customer-info">
                        <div className="customer-name">{customer.name}</div>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="customer-email">{customer.email}</div>
                        <div className="customer-phone">{customer.phone}</div>
                      </div>
                    </td>
                    <td>
                      <div className="company-info">
                        {customer.company || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <span className={`customer-type ${customer.customerType}`}>
                        {customer.customerType}
                      </span>
                    </td>
                    <td>
                      <div className="payment-terms">
                        {getPaymentTermsDisplay(customer.paymentTerms)}
                      </div>
                    </td>
                    <td>
                      <div className="join-date">
                        {customer.joinDate
                          ? new Date(customer.joinDate).toLocaleDateString()
                          : customer.createdAt
                            ? new Date(customer.createdAt).toLocaleDateString()
                            : 'N/A'
                        }
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${customer.status || 'active'}`}>
                        {(customer.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
                        </button>
                        {activeTab === 'active' ? (
                          <button
                            className="action-btn deactivate-btn"
                            onClick={() => handleStatusChange(customer._id, 'active', 'inactive')}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            className="action-btn activate-btn"
                            onClick={() => handleStatusChange(customer._id, 'inactive', 'active')}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagment;