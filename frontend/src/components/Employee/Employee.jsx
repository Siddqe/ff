import React, { useState, useEffect } from 'react';
import { employeeService } from '../../services/employee';
import { useAuth } from '../../context/AuthContext';
import './Employee.css';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { isValidPhoneNumber } from 'react-phone-number-input';

const EmployeeManagement = ({ onEmployeeUpdate }) => {
  const { user, logout } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [formAttempts, setFormAttempts] = useState(0);
  const [phoneError, setPhoneError] = useState(''); // NEW: Separate state for phone validation

  const [emailError, setEmailError] = useState(''); // NEW: Email validation error state
  const [checkingEmail, setCheckingEmail] = useState(false); // NEW: Loading state for email check

  // NEW: State for dynamic categories
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [panError, setPanError] = useState(''); 
  
  // State for address dropdowns
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState({
    countries: false,
  });

  const [formData, setFormData] = useState({
    personId: '',
    email: '',
    password: '',
    name: '',
    designation: '',
    department: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    country: '',
    state: '',
    city: '',
    pinCode: '',
    panNumber: '',
    joiningDate: '',
    status: 'Active'
  });

  // Skeleton data for loading state
  const skeletonEmployees = Array(5).fill().map((_, index) => ({
    _id: `skeleton-${index}`,
    employeeId: `ZIC${String(index + 1).padStart(3, '0')}`,
    name: '',
    email: '',
    designation: '',
    department: '',
    status: 'Active',
    isSkeleton: true
  }));

  // Load employees on component mount
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getEmployees();
      setEmployees(data.employees);
     
      if (onEmployeeUpdate) {
        onEmployeeUpdate();
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      setError('Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  // NEW: Load categories from backend
  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      // Option 1: Load all categories at once
      const categoriesData = await employeeService.getAllEmployeeCategories();
      
      if (categoriesData.success) {
        setDesignations(categoriesData.data['employee-designation'] || []);
        setDepartments(categoriesData.data['employee-role'] || []);
      }
      } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories. Using default values.');
      // Fallback to default values if API fails
      setDesignations([
        { name: 'Senior Developer' },
        { name: 'Junior Developer' },
        { name: 'Project Manager' },
        { name: 'UI/UX Designer' }
      ]);
      setDepartments([
        { name: 'Engineering' },
        { name: 'Management' },
        { name: 'Design' },
        { name: 'Sales' }
      ]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadCountries();
  } , []);

  // Load countries

    const loadCountries = async () => {
    try {
      setLoadingLocations(true);
      const countriesData = await employeeService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error('Error loading countries:', error);
      setError('Failed to load countries list');
    } finally {
      setLoadingLocations(false);
    }
  };

   const handleCountryChange = async (countryCode, isEdit = false) => {
    setFormData(prev => ({
      ...prev,
      country: countryCode,
      state: isEdit ? prev.state : '',   // 👈 keep old state when editing
      city: isEdit ? prev.city : ''
    }));
    setStates([]);
   
if (countryCode) {
    try {
      setLoadingLocations(true);
      const statesData = await employeeService.getStates(countryCode);
     
      // Ensure statesData is always an array
      if (Array.isArray(statesData)) {
        setStates(statesData);
      } else {
        console.error('States data is not an array:', statesData);
        setStates([]);
        setError('Failed to load states list - invalid data format');
      }
    } catch (error) {
      console.error('Error loading states:', error);
      setError('Failed to load states list');
      setStates([]); // Ensure states is always an array
    } finally {
      setLoadingLocations(false);
    }
   }
  };


  useEffect(() => {
    loadEmployees();
    loadCategories();
  }, []);

    // NEW: Function to check if email already exists
  const checkEmailExists = async (email) => {
    if (!email || !isValidEmail(email)) {
      setEmailError('');
      return false;
    }

    setCheckingEmail(true);
    try {
      // Check in existing employees list first (client-side cache)
      const existingEmployee = employees.find(emp => 
        emp.email.toLowerCase() === email.toLowerCase()
      );
      
      if (existingEmployee) {
        setEmailError('Email already exists for another employee');
        return true;
      }

      // If not found in cache, check with backend API
      // You might need to create an API endpoint for email validation
      // For now, we'll rely on the form submission error handling
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

  // NEW: Email validation function
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ID generation function
  const generateNextEmployeeId = async () => {
    try {
      const latestData = await employeeService.getEmployees();
      const existingEmployees = latestData.employees;
     
      const zicEmployeeIds = existingEmployees
        .map(emp => emp.employeeId)
        .filter(id => id && id.startsWith('ZIC'))
        .sort();

      if (zicEmployeeIds.length === 0) {
        return 'ZIC001';
      }

      const numbers = zicEmployeeIds.map(id => {
        const numStr = id.replace('ZIC', '');
        return parseInt(numStr, 10) || 0;
      });

      const maxNumber = Math.max(...numbers);

      for (let i = 1; i <= 5; i++) {
        const tryNumber = maxNumber + i;
        const tryId = `ZIC${tryNumber.toString().padStart(3, '0')}`;
       
        const exists = existingEmployees.some(emp => emp.employeeId === tryId);
        if (!exists) {
          return tryId;
        }
      }

      for (let i = 1; i <= 10; i++) {
        const tryNumber = maxNumber + 10 + i;
        const tryId = `ZIC${tryNumber.toString().padStart(3, '0')}`;
       
        const exists = existingEmployees.some(emp => emp.employeeId === tryId);
        if (!exists) {
          return tryId;
        }
      }

      throw new Error('Could not find available employee ID');
    } catch (error) {
      console.error('Error generating employee ID:', error);
      const timestamp = Date.now().toString().slice(-3);
      return `ZIC${timestamp}`;
    }
  };

  // Auto-dismiss messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
     
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // NEW: Phone validation function
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

// In your Employee.jsx - update the handleUpdateEmployee function
const handleUpdateEmployee = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setSuccess('');

  // Validate phone number
  if (!validatePhoneNumber(formData.phone)) {
    setLoading(false);
    return;
  }

    // Validate address fields
    if (!formData.addressLine1 || !formData.country || !formData.state || !formData.city || !formData.pinCode) {
      setError('Please fill all required address fields');
      setLoading(false);
      return;
    }

    // // Validate PIN code format
    // const pinRegex = /^[1-9][0-9]{5}$/;
    // if (!pinRegex.test(formData.pinCode)) {
    //   setError('Please enter a valid 6-digit PIN code');
    //   setLoading(false);
    //   return;
    // }
  // Validate email format if provided and changed
  const currentEmail = editingEmployee.email;
  const newEmail = formData.email;
  
  if (newEmail && newEmail !== currentEmail) {
    if (!isValidEmail(newEmail)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }
  }

  // Only validate PAN if it's provided and different from current
  const currentPan = editingEmployee.panNumber;
  const newPan = formData.panNumber;
  
  if (newPan && newPan !== currentPan && !validatePanNumber(newPan)) {
    setLoading(false);
    return;
  }

  try {
    const updateData = { 
      name: formData.name,
      email: formData.email,
      designation: formData.designation,
      department: formData.department,
      phone: formData.phone,
      // ✅ CORRECT: Create address object as expected by backend
       // Use dot notation for address fields
      'address.addressLine1': formData.addressLine1,
      'address.addressLine2': formData.addressLine2 || '',
      'address.country': formData.country,
      'address.state': formData.state,
      'address.city': formData.city,
      'address.pinCode': formData.pinCode,
      panNumber: formData.panNumber,
      joiningDate: formData.joiningDate,
      status: formData.status
     };

    // ✅ Remove password field if empty (don't overwrite password)
    if (!updateData.password) {
      delete updateData.password;
    }
    
      // // Remove individual address fields since we're using the address object
      // delete updateData.addressLine1;
      // delete updateData.addressLine2;
      // delete updateData.country;
      // delete updateData.state;
      // delete updateData.city;
      // delete updateData.pinCode;


    // ✅ Remove PAN field if it hasn't changed (to avoid unnecessary validation)
    if (newPan === currentPan) {
      delete updateData.panNumber;
    }

    // Remove email field if it hasn't changed
    if (newEmail === currentEmail) {
      delete updateData.email;
    }

    // ✅ Perform update
    await employeeService.updateEmployee(editingEmployee.employeeId, updateData);

    setSuccess('✅ Employee updated successfully!');
    setShowAddForm(false);
    setEditingEmployee(null);
    setPhoneError(''); // Clear phone error on success
    setPanError(''); // Clear PAN error on success
    setEmailError('');

    await loadEmployees();

    if (onEmployeeUpdate) {
      onEmployeeUpdate();
    }

  } catch (error) {
    console.error('Error updating employee:', error);
    
    // Handle specific PAN duplicate error
    if (error.response?.data?.message?.includes('PAN number already exists')) {
      setPanError('PAN number already exists for another employee');
    } 
    // Handle PAN format validation error from backend
    else if (error.response?.data?.message?.includes('PAN number')) {
      setPanError(error.response.data.message);
    }
    // Handle email duplicate errors - SPECIFIC HANDLING FOR UPDATE
    else if (error.response?.data?.message?.includes('email') || error.response?.data?.message?.includes('Email')) {
      if (error.response?.data?.message?.includes('already exists in the system')) {
        setEmailError('Email already exists in the system (may belong to an admin user)');
      } else if (error.response?.data?.message?.includes('already exists for another employee')) {
        setEmailError('Email already exists for another employee');
      } else {
        setEmailError('Email already exists');
      }
    }
    else {
      setError(error.response?.data?.message || '❌ Failed to update employee. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};

  // Handle add button click
  const handleAddButtonClick = async () => {
    try {
      setIsGeneratingId(true);
      setError('');
      setPhoneError(''); // Clear phone error when opening form
      setEmailError('');
      setPanError('');
      setFormAttempts(prev => prev + 1);

      await loadEmployees();
     
      const newId = await generateNextEmployeeId();

      setFormData({
        personId: newId,
        email: '',
        password: '',
        name: '',
        designation: '',
        department: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        country: '',
        state: '',
        city: '',
        pinCode: '',
        panNumber: '',
        joiningDate: '',
        status: 'Active'
      });

      setShowAddForm(true);
      setEditingEmployee(null);
     
    } catch (error) {
      console.error('Error opening add form:', error);
      setError('Failed to prepare employee form. Please try again.');
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Handle status change with auto-tab switching
  const handleStatusChange = async (employeeId, currentStatus, newStatus) => {
    const confirmationMessage = `Are you sure you want to change the status from ${currentStatus} to ${newStatus}?`;
   
    if (window.confirm(confirmationMessage)) {
      try {
        await employeeService.updateEmployee(employeeId, { status: newStatus });
        await loadEmployees();
        if (onEmployeeUpdate) {
          onEmployeeUpdate();
        }
        setSuccess(`Employee status changed to ${newStatus} successfully!`);
       
        // Auto-switch tabs based on new status
        if (newStatus === 'Active') {
          setActiveTab('active');
        } else {
          setActiveTab('inactive');
        }
      } catch (error) {
        setError('Error updating employee status');
        console.error('Error updating employee status:', error);
      }
    }
  };

  // Handle add employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    // setPanError(''); // Clear previous PAN errors


    // Validate phone number
    if (!validatePhoneNumber(formData.phone)) {
      setLoading(false);
      return;
    }
       // Validate address fields
    if (!formData.addressLine1 || !formData.country || !formData.state || !formData.city || !formData.pinCode) {
      setError('Please fill all required address fields');
      setLoading(false);
      return;
    }

    // Validate PIN code format
    // const pinRegex = /^[1-9][0-9]{5}$/;
    // if (!pinRegex.test(formData.pinCode)) {
    //   setError('Please enter a valid 6-digit PIN code');
    //   setLoading(false);
    //   return;
    // }

    if (!validatePanNumber(formData.panNumber)) {
      setLoading(false);
      return;
    }
    
    // Validate email format
    if (!isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Check if email already exists (final check before submission)
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      setLoading(false);
      return;
    }

    // Validate that selected designation and department exist in categories
    if (!designations.some(d => d.name === formData.designation)) {
      setError('Please select a valid designation from the list');
      setLoading(false);
      return;
    }

    if (!departments.some(d => d.name === formData.department)) {
      setError('Please select a valid department from the list');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for registration
    const registrationData = {
      personId: formData.personId,
      email: formData.email,
      password: formData.password,
      name: formData.name,
      designation: formData.designation,
      department: formData.department,
      phone: formData.phone,
      // ✅ CORRECT: Create address object as expected by backend
      address: {
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || '',
        country: formData.country,
        state: formData.state,
        city: formData.city, // This will be mapped to district in backend if needed
        pinCode: formData.pinCode
      },
      panNumber: formData.panNumber,
      joiningDate: formData.joiningDate,
      status: formData.status
    };

      // Remove individual address fields since we're using the address object
      delete registrationData.addressLine1;
      delete registrationData.addressLine2;
      delete registrationData.country;
      delete registrationData.state;
      delete registrationData.city;
      delete registrationData.pinCode;

      // ✅ Proceed with registration
      const response = await employeeService.registerEmployee(registrationData);

      setSuccess('✅ Employee registered successfully!');
      setShowAddForm(false);
      setEditingEmployee(null);
      setPhoneError(''); // Clear phone error on success
      setPanError(''); // Clear PAN error on success
      setEmailError('');

      // ✅ Reload employees list
      await loadEmployees();

      // ✅ Notify parent component (if applicable)
      if (onEmployeeUpdate) {
        onEmployeeUpdate();
      }

    } catch (error) {
      console.error('Registration error:', error);


    // Handle specific error cases with proper error messages
    if (error.response?.data?.message) {
      const errorMessage = error.response.data.message;

      // Handle PAN-related errors
      if (errorMessage.includes('PAN number') || errorMessage.includes('PAN')) {
        if (errorMessage.includes('already exists')) {
          setPanError('PAN number already exists for another employee');
        } else if (errorMessage.includes('valid')) {
          setPanError('Please enter a valid PAN number (e.g., ABCDE1234F)');
        } else {
          setPanError(errorMessage);
        }
      }
    // Handle email duplicate errors - SPECIFIC HANDLING
    else if (errorMessage.includes('email') || errorMessage.includes('Email')) {
      if (errorMessage.includes('already exists in the system')) {
        setEmailError('Email already exists in the system (may belong to an admin user)');
      } else if (errorMessage.includes('already exists for another employee')) {
        setEmailError('Email already exists for another employee');
      } else {
        setEmailError('Email already exists');
      }
    }
    // Handle Employee ID duplicate errors
    else if (errorMessage.includes('Employee ID')) {
      const newId = await generateNextEmployeeId();
      setFormData(prev => ({
        ...prev,
        personId: newId
      }));
      setError(`Employee ID already exists. New ID generated: ${newId}. Please review and submit again.`);
    }
    // Handle all other errors
    else {
      setError(errorMessage);
    }
  } else {
    setError('Registration failed. Please try again.');
  }
} finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
     // Handle both old and new address formats
    let addressData = {
      addressLine1: '',
      addressLine2: '',
      country: '',
      state: '',
      city: '',
      pinCode: ''
    };

    if (typeof employee.address === 'object') {
      // New format with address object
      addressData = {
        addressLine1: employee.address.addressLine1 || '',
        addressLine2: employee.address.addressLine2 || '',
        country: employee.address.country || '',
        state: employee.address.state || '',
        city: employee.address.city || '',
        pinCode: employee.address.pinCode || ''
      };
    } else {
      // Old format with single address string
      addressData.addressLine1 = employee.address || '';
    }

    setFormData({
      personId: employee.employeeId,
      email: employee.email,
      password: '',
      name: employee.name,
      designation: employee.designation,
      department: employee.department,
      phone: employee.phone,
      ...addressData,
      panNumber: employee.panNumber || '',
      joiningDate: employee.joiningDate ? employee.joiningDate.split('T')[0] : '',
      status: employee.status || 'Active'
    });

    if (employee.address?.country) {
      handleCountryChange(employee.address.country, true);
    }
    setFormData((prev) => ({
      ...prev,
      state: employee.address.state || ''
    }));

    setPhoneError(''); // Clear phone error when editing
    setEmailError('');
    setPanError('');
    setShowAddForm(true);
  };

 const handleInputChange = (e) => {
    const { name, value } = e.target;
   
    if (name === 'panNumber') {
      const upperValue = value.toUpperCase();
      setFormData({
        ...formData,
        [name]: upperValue
      });
      
      // Real-time PAN validation
          if (upperValue) {
            validatePanNumber(upperValue, !!editingEmployee, editingEmployee?.panNumber);
          } else {
            setPanError('PAN number is required');
          }
        } else if (name === 'country'){
          handleCountryChange(value);
        }
    //     else if (name === 'pinCode') {
    //   // Only allow numbers for PIN code
    //   const numericValue = value.replace(/\D/g, '');
    //   setFormData({
    //     ...formData,
    //     [name]: numericValue.slice(0, 6)
    //   });
    // }
        else if (name === 'email') {
          setFormData({
            ...formData,
            [name]: value
          });
      // Real-time email validation with debounce
      if (value) {
        if (!isValidEmail(value)) {
          setEmailError('Please enter a valid email address');
        } else {
          // Clear previous error and check if email exists
          setEmailError('');
          // Add a small delay to avoid too many API calls
          const timer = setTimeout(() => {
            checkEmailExists(value);
          }, 500);
          return () => clearTimeout(timer);
        }
      } else {
        setEmailError('Email is required');
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handlePhoneChange = (value) => {
    setFormData({
      ...formData,
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

  const handleCloseModal = () => {
    setShowAddForm(false);
    setEditingEmployee(null);
    setError('');
    setPhoneError('');
    setPanError(''); // Clear PAN error when closing modal
    setEmailError('');
    setFormAttempts(0);
  };

  // Function to sort employees by Employee ID
  const sortEmployeesById = (employeesArray) => {
    return [...employeesArray].sort((a, b) => {
      const idA = a.employeeId?.replace(/\D/g, '') || '';
      const idB = b.employeeId?.replace(/\D/g, '') || '';
      const numA = parseInt(idA, 10) || 0;
      const numB = parseInt(idB, 10) || 0;
      return numA - numB;
    });
  };

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.panNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter employees based on active tab
  const statusFilteredEmployees = filteredEmployees.filter(employee =>
    activeTab === 'active' ? employee.status === 'Active' : employee.status === 'Inactive'
  );

  // Sort the filtered employees by Employee ID
  const sortedEmployees = sortEmployeesById(statusFilteredEmployees);

// Enhanced PAN validation function
const validatePanNumber = (pan, isUpdate = false, currentPan = '') => {
  if (!pan) {
    setPanError('PAN number is required');
    return false;
  }
  
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const isValid = panRegex.test(pan);
  
  if (!isValid) {
    setPanError('Invalid PAN format. Must be 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)');
    return false;
  }
  
  // For updates, if PAN hasn't changed, it's valid
  if (isUpdate && pan === currentPan) {
    setPanError('');
    return true;
  }
  
  setPanError('');
  return true;
};
// Validate PIN code format
  //const validatePinCode = (pin) => {
  //   const pinRegex =  /^[A-Za-z0-9]{2,10}$/;
  //   return pinRegex.test(pin);
  // };


  return (
    <div className="employee-management">
      {/* Success and Error Messages */}
      {success && (
        <div className="alert success-alert">
          <span>{success}</span>
          <button className="close-alert" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {error && (
        <div className="alert error-alert">
          <span>{error}</span>
          <button className="close-alert" onClick={() => setError('')}>×</button>
        </div>
      )}

          {/* Overview Stats Cards */}
    <div className="stats-cards-container">
      <div className="stat-card total-employees">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div className="stat-content">
          <div className="stat-number">{employees.length}</div>
          <div className="stat-label">All Employees</div>
        </div>
      </div>

      <div className="stat-card active-employees">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div className="stat-content">
          <div className="stat-number">
            {employees.filter(emp => emp.status === 'Active').length}
          </div>
          <div className="stat-label">Current Employees</div>
        </div>
      </div>

      <div className="stat-card inactive-employees">
        <div className="stat-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <div className="stat-content">
          <div className="stat-number">
            {employees.filter(emp => emp.status === 'Inactive').length}
          </div>
          <div className="stat-label">Inactive Employees</div>
        </div>
      </div>
    </div>

      {/* Header Section */}
      <div className="employee-header">
        <div className="header-left">
          <div className="search-box">
            {loading ? (
              <div className="skeleton skeleton-search"></div>
            ) : (
              <input
                type="text"
                placeholder="Search employees by ID, name, email, department, or PAN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            )}
          </div>
        </div>
       
        <div className="header-right">
          {!loading && (
            <button
              className="add-employee-btn"
              onClick={handleAddButtonClick}
              disabled={isGeneratingId}
            >
              <span className="btn-icon">+</span>
              {isGeneratingId ? 'Generating ID...' : 'Add Employee'}
            </button>
          )}
        </div>
      </div>

      {/* Control Tabs Section - Embedded in table card */}
      <div className="employees-table-container">
        {/* Tab Navigation - Embedded in table card */}
        <div className="table-card-header">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Employees
            </button>
            <button
              className={`tab-button ${activeTab === 'inactive' ? 'active' : ''}`}
              onClick={() => setActiveTab('inactive')}
            >
              Inactive Employees
            </button>
          </div>
        </div>
        
        <table className="employees-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton loading state
              skeletonEmployees.map((employee, index) => (
                <tr key={employee._id} className="employee-row">
                  <td>
                    <div className="skeleton skeleton-text skeleton-text-small"></div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="skeleton skeleton-text skeleton-text-medium"></div>
                      <div className="skeleton skeleton-text skeleton-text-large"></div>
                    </div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-text skeleton-text-medium"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-badge"></div>
                  </td>
                  <td>
                    <div className="skeleton skeleton-badge"></div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                      <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : sortedEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <p style={{ marginTop: '16px', fontSize: '16px', fontWeight: '600' }}>
                      No {activeTab === 'active' ? 'active' : 'inactive'} employees found
                    </p>
                    <p style={{ marginTop: '8px', fontSize: '14px' }}>
                      {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first employee'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Actual employee data - SIMPLIFIED ACTION BUTTONS
              sortedEmployees.map(employee => (
                <tr key={employee._id || employee.employeeId} className="employee-row">
                  <td>
                    <div className="employee-id">{employee.employeeId}</div>
                  </td>
                  <td>
                    <div className="employee-info-compact">
                      <div className="employee-name">{employee.name}</div>
                      <div className="employee-email">{employee.email}</div>
                    </div>
                  </td>
                  <td>{employee.designation}</td>
                  <td>
                    <span className="department-badge">{employee.department}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${employee.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {/* Edit Button - Simple text version */}
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEditEmployee(employee)}
                        title="Edit Employee"
                      >
                        Edit
                      </button>
                     
                      {/* Status Change Button - Simple text version */}
                      {activeTab === 'active' ? (
                        <button
                          className="action-btn deactivate-btn"
                          onClick={() => handleStatusChange(employee.employeeId, 'Active', 'Inactive')}
                          title="Deactivate Employee"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="action-btn activate-btn"
                          onClick={() => handleStatusChange(employee.employeeId, 'Inactive', 'Active')}
                          title="Activate Employee"
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
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

      {/* Add/Edit Employee Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
           
            <form className="employee-form" onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="personId">Employee ID</label>
                  <input
                    type="text"
                    id="personId"
                    name="personId"
                    value={formData.personId}
                    readOnly
                    className="readonly-input"
                  />
                  <small>Auto-generated employee ID</small>
                </div>
               
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                  {!emailError && formData.email && isValidEmail(formData.email) && (
                    <small style={{ color: '#16a34a', marginTop: '4px' }}>
                      ✓ Email format is valid
                    </small>
                  )}
                  {!emailError && !formData.email && (
                    <small style={{ color: '#64748b', marginTop: '6px' }}>
                      Enter a valid email address
                    </small>
                  )}
                  </div>
               
                <div className="form-group">
                  <label htmlFor="password">
                    {editingEmployee ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={editingEmployee ? "Enter new password" : "Enter password"}
                    pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,14}$"
                    title="Password must be 6-14 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character"
                    minLength="6"
                    required={!editingEmployee}
                  />
                  <small>Password must be 6-14 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="designation">Designation *</label>
                  <select
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    required
                    disabled={categoriesLoading}
                  >
                    <option value="">{categoriesLoading ? 'Loading designations...' : 'Select Designation'}</option>
                    {designations.map((category, index) => (
                      <option key={index} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categoriesLoading && (
                    <small style={{ color: '#64748b' }}>Loading designations...</small>
                  )}
                </div>
               
                <div className="form-group">
                  <label htmlFor="department">Department *</label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    disabled={categoriesLoading}
                  >
                    <option value="">{categoriesLoading ? 'Loading departments...' : 'Select Department'}</option>
                    {departments.map((category, index) => (
                      <option key={index} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {categoriesLoading && (
                    <small style={{ color: '#64748b' }}>Loading departments...</small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <div className="phone-input-container">
                    <PhoneInput
                      international
                      countryCallingCodeEditable={true}
                      defaultCountry="IN"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      placeholder="Enter phone number"
                      className={`custom-phone-input ${phoneError ? 'invalid-input' : ''}`}
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
               
                <div className="form-group">
                  <label htmlFor="panNumber">PAN Number *</label>
                  <input
                    type="text"
                    id="panNumber"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder="Enter PAN number (e.g., ABCDE1234F)"
                    pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                    title="Please enter a valid PAN number (e.g., ABCDE1234F)"
                    required
                    maxLength="10"
                    className={panError ? 'invalid-input' : ''}
                  />
                  {panError ? (
                    <small className="error-text" style={{ color: '#dc2626', marginTop: '4px' }}>
                      {panError}
                    </small>
                  ) : (
                    <small style={{ color: '#64748b', marginTop: '6px' }}>
                      Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
                    </small>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="joiningDate">Joining Date *</label>
                  <input
                    type="date"
                    id="joiningDate"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

             
              {/* Address Fields Section */}
              <div className="form-section">
                <h4>Address Information</h4>
               
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="addressLine1">Address Line 1 *</label>
                    <input
                      type="text"
                      id="addressLine1"
                      name="addressLine1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      placeholder="Enter street address, building name"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      id="addressLine2"
                      name="addressLine2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>
                </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">Country *</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    disabled={loadingLocations}
                  >
                    <option value="">{loadingLocations ? 'Loading countries...' : 'Select Country'}</option>
                    {countries.map(country => (
                      <option key={country.iso2} value={country.iso2}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
                 
                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <select
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  disabled={!formData.country || loadingLocations}
                  >
                  <option value="">{loadingLocations ? 'Loading states...' : 'Select State'}</option>
                  {Array.isArray(states) && states.map(state => (
                  <option key={state.iso2} value={state.iso2}>
                  {state.name}
                  </option>
                  ))}
                    </select>
                </div>
              </div>

                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      required
                    />
                  </div>
                 
                  <div className="form-group">
                    <label htmlFor="pinCode">PIN Code *</label>
                    <input
                      type="text"
                      id="pinCode"
                      name="pinCode"
                      value={formData.pinCode}
                      onChange={handleInputChange}
                      placeholder="Enter postal code"
                      // pattern="[A-Za-z0-9]{2,10}"
                      // title="Please enter a valid postal code (2-10 alphanumeric characters)"
                      required
                      maxLength="20"
                      // className={formData.pinCode && !validatePinCode(formData.pinCode) ? 'invalid-input' : ''}
                    />
                    <small>Enter the postal code for the selected country</small>
                  </div>
                </div>
              </div>

              {editingEmployee && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || categoriesLoading || panError || phoneError || emailError || !formData.addressLine1 ||
                    !formData.country ||
                    !formData.state ||
                    !formData.city ||
                    !formData.pinCode||
                    !formData.email||
                    !formData.panNumber}
                >
                  {loading ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;