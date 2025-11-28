import React, { useState, useEffect } from 'react';
import { salaryService } from '../../services/salary';
import './SalaryManagement.css';
 
const SalaryManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [activeSalaries, setActiveSalaries] = useState([]);
  const [disabledSalaries, setDisabledSalaries] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showPayslipsModal, setShowPayslipsModal] = useState(false);
  const [selectedEmployeePayslips, setSelectedEmployeePayslips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [payslipStatus, setPayslipStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedSalaryDetail, setSelectedSalaryDetail] = useState(null);
  const [showSalaryDetail, setShowSalaryDetail] = useState(false);
  const [hikePercentage, setHikePercentage] = useState('');
  const [showHikeForm, setShowHikeForm] = useState(false);
  const [showDisabledRecords, setShowDisabledRecords] = useState(false);
  const [hikeStartDate, setHikeStartDate] = useState('');
  const [previousMonthLeaves, setPreviousMonthLeaves] = useState(0);
 
  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

const [selectedFilterMonth, setSelectedFilterMonth] = useState('');
const [selectedFilterYear, setSelectedFilterYear] = useState('');
const [isAmountVisible, setIsAmountVisible] = useState(false);

// State variables
const [hikeHistory, setHikeHistory] = useState([]);
const [hikeHistoryLoading, setHikeHistoryLoading] = useState(false);
const [hikeFilterMonth, setHikeFilterMonth] = useState('');
const [hikeFilterYear, setHikeFilterYear] = useState('');
const [showAllHikes, setShowAllHikes] = useState(false); // To toggle between latest and all

// // Debounce utility function
// const debounce = (func, wait) => {
//   let timeout;
//   return function executedFunction(...args) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// };
 
  const [formData, setFormData] = useState({
    employeeId: '',
    month: currentMonth,
    year: currentYear,
    basicSalary: '',
    paidDays: 30,
    lopDays: 0,
    remainingLeaves: 0,
    leaveTaken: 0,
    earnings: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
    deductions: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
    status: 'draft'
  });
 
  const [calculatedValues, setCalculatedValues] = useState({
    lopDays: 0,
    finalPaidDays: 30,
    basicPay: 0
  });
 
  useEffect(() => {
    loadEmployees();
    loadActiveSalaries();
    loadDisabledSalaries();
  }, []);
 
  useEffect(() => {
    if (activeSalaries.length > 0) {
      checkPayslipStatus();
    }
  }, [activeSalaries]);
 
  // Helper function for proper rounding
  const roundAmount = (amount) => {
    return Math.round(parseFloat(amount) || 0);
  };
 
  // Calculate all values in a single effect to avoid loops
  useEffect(() => {
    if (!showSalaryForm) return;
 
    const calculateAllValues = () => {
      const remainingLeaves = parseFloat(formData.remainingLeaves) || 0;
      const leaveTaken = parseFloat(formData.leaveTaken) || 0;
      const basicSalary = parseFloat(formData.basicSalary) || 0;
     
      // Calculate LOP Days
      let lopDays = 0;
      if (remainingLeaves < leaveTaken) {
        lopDays = leaveTaken - remainingLeaves;
      }
     
      // Calculate Final Paid Days (30 - LOP Days)
      const finalPaidDays = 30 - lopDays;
     
      // Calculate adjusted basic pay based on final paid days
      let basicPay = basicSalary;
      if (lopDays > 0 || finalPaidDays < 30) {
        basicPay = (basicSalary / 30) * finalPaidDays;
      }
     
      const baseAmount = basicPay > 0 ? basicPay : basicSalary;
     
      // Recalculate earnings with percentages
      const updatedEarnings = formData.earnings.map(earning => {
        if (earning.percentage && parseFloat(earning.percentage) > 0) {
          const calculatedAmount = (baseAmount * parseFloat(earning.percentage)) / 100;
          return {
            ...earning,
            amount: roundAmount(calculatedAmount)
          };
        }
        return earning;
      });
 
      // Recalculate deductions with percentages
      const updatedDeductions = formData.deductions.map(deduction => {
        if (deduction.percentage && parseFloat(deduction.percentage) > 0) {
          const calculatedAmount = (baseAmount * parseFloat(deduction.percentage)) / 100;
          return {
            ...deduction,
            amount: roundAmount(calculatedAmount)
          };
        }
        return deduction;
      });
 
      // Update calculated values
      setCalculatedValues({
        lopDays,
        finalPaidDays,
        basicPay: roundAmount(basicPay)
      });
 
      // Update form data with calculated values
      setFormData(prev => ({
        ...prev,
        lopDays,
        paidDays: finalPaidDays,
        earnings: updatedEarnings,
        deductions: updatedDeductions
      }));
    };
 
    calculateAllValues();
  }, [
    showSalaryForm,
    formData.remainingLeaves,
    formData.leaveTaken,
    formData.basicSalary,
  ]);
 
  const loadEmployees = async () => {
    try {
      const data = await salaryService.getEmployeesForSalary();
      setEmployees(data.employees);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };
 
  const loadActiveSalaries = async () => {
    setLoading(true);
    try {
      const data = await salaryService.getSalaries();
      const enabledSalaries = data.salaries.filter(salary => salary.activeStatus === 'enabled');
      setActiveSalaries(enabledSalaries);
    } catch (error) {
      console.error('Error loading active salaries:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const loadDisabledSalaries = async () => {
    try {
      const data = await salaryService.getDisabledSalaries();
      const disabledSalaries = data.salaries || [];
      setDisabledSalaries(disabledSalaries);
    } catch (error) {
      console.error('Error loading disabled salaries:', error);
      setDisabledSalaries([]);
    }
  };
 
  const checkPayslipStatus = async () => {
    const status = {};
   
    for (const salary of activeSalaries) {
      try {
        const payslipsData = await salaryService.getEmployeePayslips(salary.employeeId);
        const hasPayslipForThisMonth = payslipsData.payslips.some(
          payslip => payslip.month === salary.month && payslip.year === salary.year
        );
       
        status[salary._id] = {
          hasPayslip: hasPayslipForThisMonth,
          canGenerate: !hasPayslipForThisMonth
        };
      } catch (error) {
        console.error(`Error checking payslip status for ${salary.employeeId}:`, error);
        status[salary._id] = {
          hasPayslip: false,
          canGenerate: true
        };
      }
    }
   
    setPayslipStatus(status);
  };
 
  const handleEarningChange = (index, field, value) => {
    const updatedEarnings = [...formData.earnings];
   
    if (field === 'percentage') {
      updatedEarnings[index][field] = value;
      if (value && parseFloat(value) > 0) {
        const baseAmount = calculatedValues.basicPay > 0 ? calculatedValues.basicPay : (parseFloat(formData.basicSalary) || 0);
        updatedEarnings[index].amount = roundAmount((baseAmount * parseFloat(value)) / 100);
        updatedEarnings[index].calculationType = 'percentage';
      } else {
        updatedEarnings[index].calculationType = 'amount';
      }
    } else if (field === 'amount') {
      updatedEarnings[index][field] = roundAmount(value) || 0;
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
        const baseAmount = calculatedValues.basicPay > 0 ? calculatedValues.basicPay : (parseFloat(formData.basicSalary) || 0);
        updatedDeductions[index].amount = roundAmount((baseAmount * parseFloat(value)) / 100);
        updatedDeductions[index].calculationType = 'percentage';
      } else {
        updatedDeductions[index].calculationType = 'amount';
      }
    } else if (field === 'amount') {
      updatedDeductions[index][field] = roundAmount(value) || 0;
      if (value && parseFloat(value) > 0) {
        updatedDeductions[index].percentage = '';
        updatedDeductions[index].calculationType = 'amount';
      }
    } else {
      updatedDeductions[index][field] = value;
    }
   
    setFormData(prev => ({ ...prev, deductions: updatedDeductions }));
  };
 
  const updatePayslipStatusAfterDelete = async (employeeId, month, year) => {
  try {
    // Find the salary record that matches the deleted payslip
    const salaryRecord = activeSalaries.find(
      salary =>
        salary.employeeId === employeeId &&
        salary.month === month &&
        salary.year === year
    );

    if (salaryRecord) {
      // Update the payslip status to show no payslip exists
      setPayslipStatus(prev => ({
        ...prev,
        [salaryRecord._id]: {
          hasPayslip: false,
          canGenerate: true
        }
      }));

      // Also update the local salary status to 'draft'
      setActiveSalaries(prev => 
        prev.map(salary => 
          salary._id === salaryRecord._id 
            ? { ...salary, status: 'draft' }
            : salary
        )
      );
    }
  } catch (error) {
    console.error('Error updating payslip status after delete:', error);
  }
};
  const filterActiveSalaries = activeSalaries.filter(salary => {
    if (!searchTerm) return true;
   
    const searchLower = searchTerm.toLowerCase();
    return (
      (salary.employeeId && salary.employeeId.toLowerCase().includes(searchLower)) ||
      (salary.name && salary.name.toLowerCase().includes(searchLower)) ||
      (salary.month && salary.month.toLowerCase().includes(searchLower)) ||
      (salary.year && salary.year.toString().includes(searchTerm))
    );
  });
 
  const filterDisabledSalaries = disabledSalaries.filter(salary => {
    if (!searchTerm) return true;
   
    const searchLower = searchTerm.toLowerCase();
    return (
      (salary.employeeId && salary.employeeId.toLowerCase().includes(searchLower)) ||
      (salary.name && salary.name.toLowerCase().includes(searchLower)) ||
      (salary.month && salary.month.toLowerCase().includes(searchLower)) ||
      (salary.year && salary.year.toString().includes(searchTerm))
    );
  });
 
const handleEmployeeSelect = async (employeeId) => {
  setSelectedEmployee(employeeId);
  setFormData(prev => ({ ...prev, employeeId }));
 
  if (employeeId) {
    try {
      const data = await salaryService.getEmployeeDetails(employeeId);
      setEmployeeDetails(data.employee);
 
      // For NEW records - NO automatic calculation, start fresh
      if (!editingSalary) {
        setFormData(prev => ({
          ...prev,
          remainingLeaves: 0, // Start with 0 or let user enter
          leaveTaken: 0
        }));
      }
 
      // Auto-fill basic salary from employee data if available
      if (data.employee.basicSalary) {
        setFormData(prev => ({
          ...prev,
          basicSalary: data.employee.basicSalary
        }));
      }
    } catch (error) {
      console.error('Error loading employee details:', error);
    }
  } else {
    setEmployeeDetails(null);
  }
};
 
  const handleSalaryDetail = async (salary) => {
    try {
      const data = await salaryService.getSalaryById(salary._id);
      setSelectedSalaryDetail(data.salary);
      setShowSalaryDetail(true);
      // Load hike history for this employee
      // Reset filters and load latest hike
      setHikeFilterMonth('');
      setHikeFilterYear('');
      setShowAllHikes(false);
      await loadHikeHistory(data.salary.employeeId, true);

    //   // Reset to default state
    // setHikeFilters({ month: '', year: '' });
    // setViewMode('latest');
    // Don't call loadHikeHistory here - the useEffect will handle it
    } catch (error) {
      console.error('Error loading salary details:', error);
      alert('Error loading salary details');
    }
  };

//   // Handle filter changes - FIXED: Optimized filter handling
// const handleFilterChange = useCallback((newFilters) => {
//   setHikeFilters(prev => {
//     const updatedFilters = { ...prev, ...newFilters };
    
//     // Determine view mode based on filters
//     const hasFilters = updatedFilters.month || updatedFilters.year;
//     setViewMode(hasFilters ? 'all' : 'latest');
    
//     return updatedFilters;
//   });
// }, []);

// // Clear all filters - FIXED: Instant clear
// const handleClearFilters = useCallback(() => {
//   setHikeFilters({ month: '', year: '' });
//   setViewMode('latest');
//   // No need to call loadHikeHistory here - the useEffect will trigger it
// }, []);

// // View all hikes without filters
// const handleViewAllHikes = useCallback(() => {
//   setHikeFilters({ month: '', year: '' });
//   setViewMode('all');
//   // No need to call loadHikeHistory here - the useEffect will trigger it
// }, []);
 
  const handleGiveHike = (salary) => {
    setSelectedSalaryDetail(salary);
    setShowHikeForm(true);
    setHikePercentage('');
    setHikeStartDate('');
  };
 
  const applyHike = async () => {
    if (!hikePercentage || isNaN(hikePercentage) || hikePercentage <= 0) {
      alert('Please enter a valid hike percentage');
      return;
    }
 
    if (!hikeStartDate) {
      alert('Please select a start date for the hike');
      return;
    }
 
    try {
      const hikeData = {
        startDate: hikeStartDate,
        hikePercent: parseFloat(hikePercentage),
      };
 
      await salaryService.applyHike(selectedSalaryDetail._id, hikeData);
 
      alert(
        `Hike of ${hikePercentage}% scheduled successfully! It will be effective from ${new Date(
          hikeStartDate
        ).toLocaleDateString()}`
      );
 
      setShowHikeForm(false);
      setHikePercentage('');
      setHikeStartDate('');
      setShowSalaryDetail(false);
 
      loadActiveSalaries();
      loadDisabledSalaries();
    } catch (error) {
      alert(error.response?.data?.message || 'Error applying hike');
      console.error('Error applying hike:', error);
    }
  };

//   // Debounced filter function to prevent rapid API calls
// const debouncedLoadHikeHistory = useRef(
//   debounce(async (employeeId, filters, mode) => {
//     if (!employeeId) return;
    
//     setHikeHistoryLoading(true);
//     try {
//       const apiFilters = { ...filters };
      
//       if (mode === 'latest') {
//         apiFilters.latest = true;
//       }
//       // If mode is 'all' but no specific filters, we don't add latest flag
      
//       console.log('Loading hike history with filters:', apiFilters);
      
//       const data = await salaryService.getHikeHistory(selectedSalaryDetail.employeeId, apiFilters);
//       setHikeHistory(data.hikeHistory || []);
//     } catch (error) {
//       console.error('Error loading hike history:', error);
//       setHikeHistory([]);
//     } finally {
//       setHikeHistoryLoading(false);
//     }
//   }, 300) // 300ms debounce delay
// ).current;

 
  const loadHikeHistory = async (employeeId, showLatest = true) => {
  if (!employeeId) return;
  
  setHikeHistoryLoading(true);
  try {
    const filters = {};
    
    if (showLatest && !hikeFilterMonth && !hikeFilterYear) {
      // Show only the latest hike when no filters are applied
      filters.latest = true;
      setShowAllHikes(false);
    } else if (hikeFilterMonth || hikeFilterYear) {
      // Show filtered hikes when month/year filters are applied
      if (hikeFilterMonth) filters.month = hikeFilterMonth;
      if (hikeFilterYear) filters.year = hikeFilterYear;
      setShowAllHikes(true);
    } else {
      // Show all hikes when explicitly requested
      setShowAllHikes(true);
    }
    
    const data = await salaryService.getHikeHistory(employeeId, filters);
    setHikeHistory(data.hikeHistory || []);
  } catch (error) {
    console.error('Error loading hike history:', error);
    setHikeHistory([]);
  } finally {
    setHikeHistoryLoading(false);
  }
};

// // Load hike history with current filters and view mode
// const loadHikeHistory = useCallback((forceLatest = false) => {
//   if (!selectedSalaryDetail?.employeeId) return;
  
//   const currentViewMode = forceLatest ? 'latest' : viewMode;
//   const currentFilters = forceLatest ? { month: '', year: '' } : hikeFilters;
  
//   if (forceLatest) {
//     setHikeFilters({ month: '', year: '' });
//     setViewMode('latest');
//   }
  
//   debouncedLoadHikeHistory(selectedSalaryDetail.employeeId, currentFilters, currentViewMode);
// }, [selectedSalaryDetail?.employeeId, hikeFilters, viewMode, debouncedLoadHikeHistory]);

// // Load hike history when modal opens or filters change
// useEffect(() => {
//   if (showSalaryDetail && selectedSalaryDetail?.employeeId) {
//     loadHikeHistory();
//   }
// }, [showSalaryDetail, selectedSalaryDetail?.employeeId, loadHikeHistory]);


  const checkDuplicateSalary = (employeeId, month, year, excludeSalaryId = null) => {
    return activeSalaries.some(salary =>
      salary.employeeId === employeeId &&
      salary.month === month &&
      salary.year === year &&
      salary._id !== excludeSalaryId
    );
  };
 
  const handleInputChange = (e) => {
  const { name, value } = e.target;
 
  // Store previous values before update
  const previousMonth = formData.month;
  const previousYear = formData.year;
 
  // Update the field
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
 
  // ONLY if editing AND month/year changed, then auto-calculate
  if (editingSalary &&
      ((name === 'month' && value !== previousMonth) ||
       (name === 'year' && value !== previousYear.toString()))) {
   
    // Calculate new remaining leaves = current remaining - current leave taken
    const currentRemaining = parseFloat(formData.remainingLeaves) || 0;
    const currentLeaveTaken = parseFloat(formData.leaveTaken) || 0;
    const newRemainingLeaves = Math.max(0, currentRemaining - currentLeaveTaken);
   
    // Update after a small delay to ensure state is updated
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        remainingLeaves: newRemainingLeaves,
        leaveTaken: 0 // Reset leave taken for new month
      }));
    }, 100);
   
    console.log('🔄 Editing + Month changed - Automatic leaves calculation:', {
      currentRemaining,
      currentLeaveTaken,
      newRemainingLeaves
    });
  }
};
 
  const handleBasicSalaryChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      basicSalary: value
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
 
  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const isDuplicate = checkDuplicateSalary(
      formData.employeeId,
      formData.month,
      formData.year,
      editingSalary?._id
    );
    if (isDuplicate) {
      alert('A salary record for this employee for the same month and year already exists.');
      setLoading(false);
      return;
    }

    // Round all amounts before submitting
    const roundedEarnings = formData.earnings.map(earning => ({
      ...earning,
      amount: roundAmount(earning.amount)
    }));

    const roundedDeductions = formData.deductions.map(deduction => ({
      ...deduction,
      amount: roundAmount(deduction.amount)
    }));

    // Determine status: if editing a paid record, reset to draft
    const newStatus = editingSalary && editingSalary.status === 'paid' ? 'draft' : formData.status;

    const submitData = {
      ...formData,
      basicSalary: roundAmount(formData.basicSalary),
      paidDays: calculatedValues.finalPaidDays,
      lopDays: calculatedValues.lopDays,
      earnings: roundedEarnings,
      deductions: roundedDeductions,
      status: newStatus // Use the determined status
    };

    if (editingSalary) {
      await salaryService.updateSalary(editingSalary._id, submitData);
      
      let message = 'Salary record updated successfully!';
      if (editingSalary.status === 'paid') {
        message = 'Salary record updated! Status reset to DRAFT since you edited a paid record.';
      }
      
      alert(message);
    } else {
      await salaryService.createSalary(submitData);
      alert('Salary record created successfully!');
    }
   
    setShowSalaryForm(false);
    resetForm();
    loadActiveSalaries();
  } catch (error) {
    alert(error.response?.data?.message || `Error ${editingSalary ? 'updating' : 'creating'} salary record`);
  } finally {
    setLoading(false);
  }
};
 
  const resetForm = () => {
    setFormData({
      employeeId: '',
      month: currentMonth,
      year: currentYear,
      basicSalary: '',
      paidDays: 30,
      lopDays: 0,
      remainingLeaves: 0,
      leaveTaken: 0,
      earnings: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      deductions: [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      status: 'draft'
    });
    setSelectedEmployee('');
    setEmployeeDetails(null);
    setEditingSalary(null);
    setPreviousMonthLeaves(0);
    setCalculatedValues({
      lopDays: 0,
      finalPaidDays: 30,
      basicPay: 0
    });
  };
 
const handleEditSalary = async (salary) => {
  try {
    const data = await salaryService.getSalaryById(salary._id);
    const salaryDetails = data.salary;
   
    // For editing, use the EXACT values from the record but reset status to draft
    setFormData({
      employeeId: salaryDetails.employeeId,
      month: salaryDetails.month,
      year: salaryDetails.year,
      basicSalary: salaryDetails.basicSalary,
      paidDays: salaryDetails.paidDays || 30,
      lopDays: salaryDetails.lopDays || 0,
      remainingLeaves: salaryDetails.remainingLeaves || 0,
      leaveTaken: salaryDetails.leaveTaken || 0,
      earnings: salaryDetails.earnings.length > 0 ? salaryDetails.earnings : [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      deductions: salaryDetails.deductions.length > 0 ? salaryDetails.deductions : [{ type: '', amount: 0, percentage: '', calculationType: 'amount' }],
      status: 'draft' // Reset status to draft when editing
    });
   
    setSelectedEmployee(salaryDetails.employeeId);
    setEditingSalary(salaryDetails);
    setShowSalaryForm(true);
   
    const employeeData = await salaryService.getEmployeeDetails(salaryDetails.employeeId);
    setEmployeeDetails(employeeData.employee);
  } catch (error) {
    console.error('Error loading salary details:', error);
    alert('Error loading salary details for editing');
  }
}
  const handleDeleteSalary = async (salaryId) => {
    if (window.confirm('Are you sure you want to delete this salary record?')) {
      try {
        await salaryService.deleteSalary(salaryId);
        loadActiveSalaries();
        loadDisabledSalaries();
      } catch (error) {
        alert('Error deleting salary record');
      }
    }
  };
 
  const handleDeletePayslip = async (payslipId) => {
  if (window.confirm('Are you sure you want to delete this payslip?')) {
    try {
      const payslipToDelete = selectedEmployeePayslips.find(p => p._id === payslipId);
      
      if (payslipToDelete) {
        const response = await salaryService.deletePayslip(payslipId);
        
        // Refresh the active salaries to get updated status
        await loadActiveSalaries();
        
        await updatePayslipStatusAfterDelete(
          selectedEmployeeId,
          payslipToDelete.month,
          payslipToDelete.year
        );
        
        const data = await salaryService.getEmployeePayslips(selectedEmployeeId);
        setSelectedEmployeePayslips(data.payslips);
        
        alert('Payslip deleted successfully! Salary status reset to DRAFT.');
      }
    } catch (error) {
      alert('Error deleting payslip');
    }
  }
};
 
  const handleGeneratePayslip = async (salaryId) => {
  const salary = activeSalaries.find(s => s._id === salaryId);
  if (salary && salary.activeStatus !== 'enabled') {
    alert('Cannot generate payslip for disabled salary records');
    return;
  }
  try {
    await salaryService.generatePayslip(salaryId);
    
    // Update the status to "paid" using existing update route
    await salaryService.updateSalary(salaryId, { status: 'paid' });
    
    alert('Payslip generated and sent to employee email! Status updated to PAID.');

    // Update local state
    setActiveSalaries(prev => 
      prev.map(s => 
        s._id === salaryId 
          ? { ...s, status: 'paid' }
          : s
      )
    );

    setPayslipStatus(prev => ({
      ...prev,
      [salaryId]: {
        hasPayslip: true,
        canGenerate: false
      }
    }));

    loadActiveSalaries(); // Refresh data
  } catch (error) {
    alert(error.response?.data?.message || 'Error generating payslip');
  }
};
 
  const handleViewPayslips = async (employeeId) => {
    try {
      setSelectedEmployeeId(employeeId);
      const data = await salaryService.getEmployeePayslips(employeeId);
      setSelectedEmployeePayslips(data.payslips);
      setShowPayslipsModal(true);
    } catch (error) {
      console.error('Error loading payslips:', error);
    }
  };
 
  const handleDownloadPayslip = async (payslipId) => {
    try {
      const blob = await salaryService.downloadPayslip(payslipId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error downloading payslip');
    }
  };
 
  const openAddForm = () => {
    resetForm();
    setShowSalaryForm(true);
  };
 
  const toggleDisabledRecords = () => {
    setShowDisabledRecords(!showDisabledRecords);
  };
 
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
 
  // Fixed salary summary calculations with rounding
  const totalEarnings = roundAmount(formData.earnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0));
  const totalDeductions = roundAmount(formData.deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0));
  const monthlyCtc = calculatedValues.basicPay > 0 ? calculatedValues.basicPay : roundAmount(formData.basicSalary);
  const grossEarnings = roundAmount(totalEarnings);
  const netPay = roundAmount(grossEarnings - totalDeductions);
 
  // Calculate totals for selected salary detail
  const selectedTotalEarnings = selectedSalaryDetail ? roundAmount(selectedSalaryDetail.earnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0)) : 0;
  const selectedTotalDeductions = selectedSalaryDetail ? roundAmount(selectedSalaryDetail.deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0)) : 0;
  const selectedGrossEarnings = selectedSalaryDetail ? roundAmount(selectedTotalEarnings) : 0;
  const selectedNetPay = selectedSalaryDetail ? roundAmount((selectedGrossEarnings - selectedTotalDeductions)) : 0;
 
  // Get displayed salaries based on current view
  const displayedSalaries = showDisabledRecords ? filterDisabledSalaries : filterActiveSalaries;
 
  return (
    <div className="salary-management">
     
  {/* Header with Stats */}
  <div className="salary-header">
    <div className="header-stats">
      <div className="stat-card">
        <div className="stat-value">{activeSalaries.length}</div>
        <div className="stat-label">Active Records</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {activeSalaries.filter(s => s.status === 'paid').length}
        </div>
        <div className="stat-label">Paid Salaries</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {activeSalaries.filter(s => s.status === 'draft').length}
        </div>
        <div className="stat-label">Draft Records</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{disabledSalaries.length}</div>
        <div className="stat-label">Disabled Records</div>
      </div>
    </div>
  </div>

  {/* Controls Bar */}
  <div className="controls-bar">
    <div className="search-container">
      <input
        type="text"
        placeholder="Search by Employee ID, Name, Month, or Year..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
    <div className="controls-buttons">

      <button className="add-salary-btn" onClick={openAddForm}>
        <span>+</span>
        Add Salary Record
      </button>
    </div>
  </div>

  {/* ADD THIS SECTION - Record Tabs */}

 
      {/* Salary Table */}
      <div className="salary-table-container">
        <div className='table-record-header'>
        <div className="record-tab">
          <button
            className={`record-button ${!showDisabledRecords ? 'active' : ''}`}
            onClick={() => setShowDisabledRecords(false)}
          >
            Active Records
          </button>
          <button
            className={`record-button ${showDisabledRecords ? 'active' : ''}`}
            onClick={() => setShowDisabledRecords(true)}
          >
            Disabled Records
          </button>
        </div>
        </div> 
        {loading ? (
          <div className="table-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="table-row loading-shimmer" style={{height: '60px'}}></div>
            ))}
          </div>
        ) : displayedSalaries.length === 0 ? (
          <div className="no-records">
            <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
              <h3>No {showDisabledRecords ? 'disabled' : 'active'} salary records found</h3>
              <p>{searchTerm ? 'Try adjusting your search terms' : `No ${showDisabledRecords ? 'disabled' : 'active'} salary records available`}</p>
            </div>
          </div>
        ) : (
          <div className="salary-list-container">
            <div className="table-container">
              <table className="salary-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Month</th>
                    <th>Status</th>
                    {showDisabledRecords && <th>Active Status</th>}
                    {showDisabledRecords && <th>Hike Applied</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSalaries.map((salary) => (
                    <tr
                      key={salary._id}
                      className={`salary-table-row ${showDisabledRecords ? 'disabled-row' : ''}`}
                      onClick={() => handleSalaryDetail(salary)}
                    >
                      <td>
                        <div className="employee-cell">
                          <div className="employee-details">
                            <div className="employee-name">{salary.name || 'Unknown Employee'}</div>
                            <div className="employee-designation">{salary.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="period-cell">
                          <span className="month">{salary.month}</span>
                          <span className="year">{salary.year}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${salary.status}`}>
                          {salary.status}
                        </span>
                      </td>
                      {showDisabledRecords && (
                        <td>
                          <span className={`status-badge ${salary.activeStatus === 'enabled' ? 'status-enabled' : 'status-disabled'}`}>
                            {salary.activeStatus}
                          </span>
                        </td>
                      )}
                      {showDisabledRecords && (
                        <td>
                          {salary.hikeApplied ? `${salary.hikePercentage}%` : 'No'}
                        </td>
                      )}
                      <td>
                        <div className={`table-actions ${showDisabledRecords ? 'limited-actions' : ''}`} onClick={(e) => e.stopPropagation()}>
                          {!showDisabledRecords ? (
                            <>
                              <button
                                className="action-btns primary"
                                onClick={() => handleViewPayslips(salary.employeeId)}
                                title="View Payslips"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                              </button>
                              <button
                                className={`action-btns ${payslipStatus[salary._id]?.hasPayslip ? 'success' : 'warning'}`}
                                onClick={() => handleGeneratePayslip(salary._id)}
                                disabled={payslipStatus[salary._id]?.hasPayslip}
                                title={payslipStatus[salary._id]?.hasPayslip ? 'Paid' : 'Generate Payslip'}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                  <line x1="16" y1="13" x2="8" y2="13"></line>
                                  <line x1="16" y1="17" x2="8" y2="17"></line>
                                  <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                              </button>
                              <button
                                className="action-btns"
                                onClick={() => handleEditSalary(salary)}
                                title="Edit Salary"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                            </>
                          ) : (
                            <button
                              className="action-btns"
                              onClick={() => handleSalaryDetail(salary)}
                              title="View Details"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                          )}
                          <button
                            className="action-btns danger"
                            onClick={() => handleDeleteSalary(salary._id)}
                            title="Delete Record"
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
 
      {/* Salary Detail Modal */}
      {showSalaryDetail && selectedSalaryDetail && (
        <div className="modals-overlay" onClick={() => setShowSalaryDetail(false)}>
          <div className="modal-content large-modals" onClick={(e) => e.stopPropagation()}>
            <div className="modals-header">
              <h3>Salary Details - {selectedSalaryDetail.name}</h3>
              <button className="close-btn" onClick={() => setShowSalaryDetail(false)}>×</button>
            </div>
            <div className="modals-body">
              <div className="salary-detail-container">
                {/* Employee Information */}
                <div className="detail-section">
                  <h4 className="section-title">Employee Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Employee ID:</span>
                      <span className="detail-value">{selectedSalaryDetail.employeeId}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Name:</span>
                      <span className="detail-value">{selectedSalaryDetail.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Period:</span>
                      <span className="detail-value">{selectedSalaryDetail.month} {selectedSalaryDetail.year}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge status-${selectedSalaryDetail.status}`}>
                        {selectedSalaryDetail.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Active Status:</span>
                      <span className={`status-badge ${selectedSalaryDetail.activeStatus === 'enabled' ? 'status-enabled' : 'status-disabled'}`}>
                        {selectedSalaryDetail.activeStatus}
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
                          <span className="currency">Rs.{selectedSalaryDetail.basicSalary?.toFixed(2)}</span>
                        </div> */}
                        {selectedSalaryDetail.earnings?.map((earning, index) => (
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
                        {selectedSalaryDetail.deductions?.map((deduction, index) => (
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
 
                {/* Leave Information */}
                <div className="detail-section">
                  <h4 className="section-title">Leave Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Paid Days:</span>
                      <span className="detail-value">{selectedSalaryDetail.paidDays}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">LOP Days:</span>
                      <span className="detail-value">{selectedSalaryDetail.lopDays}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Leave Taken:</span>
                      <span className="detail-value">{selectedSalaryDetail.leaveTaken}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Remaining Leaves:</span>
                      <span className="detail-value">{selectedSalaryDetail.remainingLeaves}</span>
                    </div>
                  </div>
                </div>
{/* Hike History Section */}
<div className="detail-section">
  <div className="section-header">
    <h4 className="section-title">
      {showAllHikes ? 'Hike History' : 'Latest Hike'}
    </h4>
    <div className="hike-controls">
      <div className="hike-filter-controls">
        <select 
          className="filter-select"
          value={hikeFilterMonth}
          onChange={(e) => {
            setHikeFilterMonth(e.target.value);
            if (e.target.value || hikeFilterYear) {
              loadHikeHistory(selectedSalaryDetail.employeeId, false);
            }
          }}
        >
          <option value="">Select Month</option>
          {months.map(month => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
        <select 
          className="filter-select"
          value={hikeFilterYear}
          onChange={(e) => {
            setHikeFilterYear(e.target.value);
            if (e.target.value || hikeFilterMonth) {
              loadHikeHistory(selectedSalaryDetail.employeeId, false);
            }
          }}
        >
          <option value="">Select Year</option>
          {Array.from({length: currentYear - 2020 + 1}, (_, i) => currentYear - i)
            .map(year => (
              <option key={year} value={year}>{year}</option>
            ))
          }
        </select>
        {(hikeFilterMonth || hikeFilterYear) && (
          <button 
            className="clear-filters-btn"
            onClick={() => {
              setHikeFilterMonth('');
              setHikeFilterYear('');
              loadHikeHistory(selectedSalaryDetail.employeeId, true);
            }}
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {!showAllHikes && hikeHistory.length > 0 && (
        <button 
          className="view-all-hikes-btn"
          onClick={() => {
            setShowAllHikes(true);
            loadHikeHistory(selectedSalaryDetail.employeeId, false);
          }}
        >
          View All Hikes
        </button>
      )}
      
      {showAllHikes && (
        <button 
          className="view-latest-btn"
          onClick={() => {
            setShowAllHikes(false);
            setHikeFilterMonth('');
            setHikeFilterYear('');
            loadHikeHistory(selectedSalaryDetail.employeeId, true);
          }}
        >
          Show Latest Only
        </button>
      )}
    </div>
  </div>
  
  {hikeHistoryLoading ? (
    <div className="loading-state">
      <div className="loading-spinner"></div>
      Loading hike history...
    </div>
  ) : hikeHistory.length > 0 ? (
    <div className="hike-history-container">
      {/* {!showAllHikes && hikeHistory.length === 1 && (
        <div className="latest-hike-banner">
          <span className="banner-text">Showing Latest Hike</span>
        </div>
      )}
       */}
      {(showAllHikes || hikeFilterMonth || hikeFilterYear) && hikeHistory.length > 0 && (
        <div className="hike-results-info">
          Found {hikeHistory.length} hike{hikeHistory.length !== 1 ? 's' : ''} 
          {hikeFilterMonth && ` in ${hikeFilterMonth}`}
          {hikeFilterYear && ` ${hikeFilterYear}`}
        </div>
      )}
      
      <div className="hike-history-table">
        <table className="history-table">
          <thead>
            <tr>
              <th>Month/Year</th>
              <th>Hike %</th>
              <th>Start Date</th>
              <th>Previous Basic</th>
              <th>New Basic</th>
              <th>Hike Amount</th>
            </tr>
          </thead>
          <tbody>
            {hikeHistory.map((hike, index) => (
              <tr key={hike._id || index} className={`hike-history-row ${index === 0 && !showAllHikes ? 'latest-hike' : ''}`}>
                <td>
                  <div className="hike-period">
                    <span className="hike-month">{hike.month}</span>
                    <span className="hike-year">{hike.year}</span>
                  </div>
                </td>
                <td>
                  <span className="hike-percentage-badge">
                    {hike.hikePercentage}%
                  </span>
                </td>
                <td>
                  {new Date(hike.hikeStartDate).toLocaleDateString()}
                </td>
                <td className="currency">Rs.{hike.previousBasicSalary?.toFixed(2)}</td>
                <td className="currency">Rs.{hike.newBasicSalary?.toFixed(2)}</td>
                <td className="currency hike-amount">
                  +Rs.{hike.hikeAmount?.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <div className="no-hike-history">
      {hikeFilterMonth || hikeFilterYear ? (
        <p>No hikes found for the selected filters.</p>
      ) : (
        <p>No hike history available for this employee.</p>
      )}
    </div>
  )}
</div>
                {/* Action Buttons */}
                <div className="detail-actions">
                  {selectedSalaryDetail.activeStatus === 'enabled' && (
                    <button
                      className="action-btns primary"
                      onClick={() => handleGiveHike(selectedSalaryDetail)}
                    >
                      Add Hike
                    </button>
                  )}
                  <button
                    className="action-btns"
                    onClick={() => {
                      setShowSalaryDetail(false);
                      setHikeFilterMonth('');
                      setHikeFilterYear('');
                      setHikeHistory([]);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Hike Form Modal */}
      {showHikeForm && selectedSalaryDetail && (
        <div className="modal-overlay" onClick={() => setShowHikeForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Apply Hike - {selectedSalaryDetail.name}</h3>
              <button className="close-btn" onClick={() => setShowHikeForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="hike-form">
                <div className="form-group">
                  <label className="form-labels">Current Basic Salary</label>
                  <input
                    type="text"
                    className="form-input"
                    value={`Rs.${selectedSalaryDetail.basicSalary?.toFixed(2)}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hike Percentage (%) </label>
                  <input
                    type="number"
                    className="form-input"
                    value={hikePercentage}
                    onChange={(e) => setHikePercentage(e.target.value)}
                    placeholder="Enter hike percentage"
                    min="1"
                    max="100"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hike Start Date </label>
                  <input
                    type="date"
                    className="form-input"
                    value={hikeStartDate}
                    onChange={(e) => setHikeStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                {hikePercentage && (
                  <div className="hike-preview">
                    <div className="hike-calculation">
                      <span>Hike Amount:</span>
                      <span>Rs.{roundAmount((selectedSalaryDetail.basicSalary) * hikePercentage / 100).toFixed(2)}</span>
                    </div>
                    <div className="hike-calculation total">
                      <span>New Basic Salary:</span>
                      <span>Rs.{roundAmount((selectedSalaryDetail.basicSalary ) * (1 + hikePercentage / 100)).toFixed(2)}</span>
                    </div>
                    <div className="hike-note">
                      <p><strong>Note:</strong> The new salary will be effective from {hikeStartDate ? new Date(hikeStartDate).toLocaleDateString() : 'selected date'}.
                      Current salary record will be disabled and moved to disabled records on that date.</p>
                    </div>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowHikeForm(false)}
                    className="action-btns"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyHike}
                    className="action-btns primary"
                    disabled={!hikePercentage || !hikeStartDate}
                  >
                    Apply Hike
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* Add/Edit Salary Form Modal */}
      {showSalaryForm && (
        <div className="modals-overlay" onClick={() => setShowSalaryForm(false)}>
          <div className="modal-content large-modals" onClick={(e) => e.stopPropagation()}>
            <div className="modals-header">
              <h3>{editingSalary ? 'Edit Salary Record' : 'Add Salary Record'}</h3>
              <button className="close-btn" onClick={() => setShowSalaryForm(false)}>×</button>
            </div>
            <div className="modals-body">
              <form onSubmit={handleSubmit} className="salary-form">
                <div className="form-sections">
                  {/* Employee Information */}
                  <div className="form-section">
                    <h4 className="section-title">Employee Information</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Select Employee *</label>
                        <select
                          className="form-select"
                          value={selectedEmployee}
                          onChange={(e) => handleEmployeeSelect(e.target.value)}
                          required
                          disabled={!!editingSalary}
                        >
                          <option value="">Select Employee</option>
                          {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                              {emp.employeeId} - {emp.name} ({emp.designation})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                   
                    {employeeDetails && (
                      <div className="employee-auto-fill">
                        <div className="auto-fill-info">
                          <p><strong>Name:</strong> {employeeDetails.name}</p>
                          <p><strong>Email:</strong> {employeeDetails.email}</p>
                          <p><strong>Designation:</strong> {employeeDetails.designation}</p>
                          <p><strong>Department:</strong> {employeeDetails.department}</p>
                          <p><strong>Pan no:</strong> {employeeDetails.panNumber}</p>
                          {previousMonthLeaves > 0 && (
                            <p><strong>Previous Month Remaining Leaves:</strong> {previousMonthLeaves}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
 
                  {/* Salary Period */}
                  <div className="form-section">
                    <h4 className="section-title">Salary Period</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Month *</label>
                        <select
                          className="form-select"
                          name="month"
                          value={formData.month}
                          onChange={handleInputChange}
                          required
                        >
                          <option value="">Select Month</option>
                          {months.map(month => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Year *</label>
                        <input
                          type="number"
                          className="form-input"
                          name="year"
                          value={formData.year}
                          onChange={handleInputChange}
                          required
                          disabled={!!editingSalary}
                        />
                      </div>
                    </div>
                  </div>
 
                  {/* Salary Details */}
                  <div className="form-section">
                    <h4 className="section-title">Salary Details</h4>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Basic Salary (Monthly) *</label>
                        <input
                          type="number"
                          className="form-input"
                          name="basicSalary"
                          value={formData.basicSalary}
                          onChange={handleBasicSalaryChange}
                          required
                          step="0.01"
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
    readOnly={!!editingSalary} // Read-only only when editing
    disabled={!!editingSalary} // Disabled only when editing
    style={editingSalary ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
  />
  <small className="form-help">
    {editingSalary
      ? 'Automatically calculated when changing months'
      : 'Enter remaining leaves for this month'
    }
  </small>
</div>
                      <div className="form-group">
                        <label className="form-label">Leave Taken</label>
                        <input
                          type="number"
                          className="form-input"
                          name="leaveTaken"
                          value={formData.leaveTaken}
                          onChange={handleInputChange}
                          min="0"
                        />
                        <small className="form-help">Enter leaves taken this month</small>
                      </div>
                    </div>
 
                    {/* Calculated Values Display */}
                    <div className="calculated-values-section">
                      <h5 className="calculated-title">Automatically Calculated Values</h5>
                      <div className="calculated-grid">
                        <div className="calculated-item">
                          <span className="calculated-label">LOP Days:</span>
                          <span className="calculated-value">{calculatedValues.lopDays}</span>
                        </div>
                        <div className="calculated-item">
                          <span className="calculated-label">Final Paid Days:</span>
                          <span className="calculated-value">{calculatedValues.finalPaidDays}</span>
                        </div>
                        <div className="calculated-item">
                          <span className="calculated-label">Basic Pay (Adjusted):</span>
                          <span className="calculated-value currency">Rs.{calculatedValues.basicPay.toFixed(2)}</span>
                        </div>
                        {calculatedValues.lopDays > 0 && (
                          <div className="calculated-note">
                            <p><strong>Calculation:</strong> Basic Pay = (Rs.{formData.basicSalary || '0'} / 30) * {calculatedValues.finalPaidDays} = Rs.{calculatedValues.basicPay.toFixed(2)}</p>
                            <p><strong>Note:</strong> {calculatedValues.lopDays} LOP day(s) detected. Basic pay has been adjusted based on {calculatedValues.finalPaidDays} paid days.</p>
                          </div>
                        )}
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
                              placeholder="Earning type"
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
                              placeholder="Deduction type"
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
                        <span className="summary-table-label">Original Basic Salary:</span>
                        <span className="summary-table-value">Rs.{formData.basicSalary ? roundAmount(formData.basicSalary).toFixed(2) : '0.00'}</span>
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
                      onClick={() => setShowSalaryForm(false)}
                      className="action-btns"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="action-btns primary"
                    >
                      {loading ? (editingSalary ? 'Updating...' : 'Creating...') : (editingSalary ? 'Update Salary Record' : 'Create Salary Record')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
 
{/* Payslips Modal */}
{showPayslipsModal && (
  <div className="modal-overlay" onClick={() => setShowPayslipsModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Employee Payslips</h3>
        <button className="close-btn" onClick={() => setShowPayslipsModal(false)}>×</button>
      </div>
      <div className="modal-body">
        {/* Filter Controls */}
        <div className="filter-section">
          <h4 className="section-title">Filter Payslips</h4>
          <div className="filter-controls">
            <div className="filter-group">
              <label className="filter-label">Month</label>
              <select 
                className="filter-select"
                value={selectedFilterMonth}
                onChange={(e) => setSelectedFilterMonth(e.target.value)}
              >
                <option value="">Select Month</option>
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label">Year</label>
              <select 
                className="filter-select"
                value={selectedFilterYear}
                onChange={(e) => setSelectedFilterYear(e.target.value)}
              >
                <option value="">Select Year</option>
                {Array.from({length: currentYear - 2000 + 1}, (_, i) => currentYear - i)
                  .map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))
                }
              </select>
            </div>
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSelectedFilterMonth('');
                setSelectedFilterYear('');
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Current/Latest Payslip Section */}
        <div className="current-payslip-section">
          <h4 className="section-title">Current Payslip</h4>
          {(() => {
            // Get filtered payslips based on selected filters
            const filteredPayslips = selectedEmployeePayslips.filter(payslip => {
              const monthMatch = !selectedFilterMonth || payslip.month === selectedFilterMonth;
              const yearMatch = !selectedFilterYear || payslip.year.toString() === selectedFilterYear;
              return monthMatch && yearMatch;
            });

            // Find current month payslip or latest available payslip
            let displayPayslip = null;
            
            if (selectedFilterMonth || selectedFilterYear) {
              // If filters are applied, show the most recent payslip from filtered results
              displayPayslip = filteredPayslips.sort((a, b) => {
                const dateA = new Date(a.year, months.indexOf(a.month));
                const dateB = new Date(b.year, months.indexOf(b.month));
                return dateB - dateA;
              })[0];
            } else {
              // No filters - try current month first, then previous month
              displayPayslip = selectedEmployeePayslips.find(payslip => 
                payslip.month === currentMonth && payslip.year === currentYear
              );
              
              if (!displayPayslip) {
                // If no current month payslip, find the latest available payslip
                displayPayslip = selectedEmployeePayslips.sort((a, b) => {
                  const dateA = new Date(a.year, months.indexOf(a.month));
                  const dateB = new Date(b.year, months.indexOf(b.month));
                  return dateB - dateA;
                })[0];
              }
            }
            
            return displayPayslip ? (
              <div className="current-payslip-card">
                <div className="payslip-header">
                  <div className="payslip-period">
                    {displayPayslip.month} {displayPayslip.year}
                  </div>
                  {/* <div className="payslip-status-badge current">
                    {displayPayslip.month === currentMonth && displayPayslip.year === currentYear ? 'CURRENT' : 'OLDER'}
                  </div> */}
                  <div className="payslip-amount-section">
                    <div className="amount-display">
                      <span className="amount-label">Net Amount:</span>
                      <div className="amount-container">
                        <span className="amount-value">
                          {isAmountVisible ? `Rs.${displayPayslip.netPay?.toFixed(2)}` : '********'}
                        </span>
                        <button
                          className="toggle-amount-btn"
                          onClick={() => setIsAmountVisible(!isAmountVisible)}
                          type="button"
                        >
                          <svg 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2"
                          >
                            {isAmountVisible ? (
                              // Eye with slash icon (visible state)
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </>
                            ) : (
                              // Eye icon (hidden state)
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="payslip-details">
                  <div className="payslip-date">
                    Generated: {new Date(displayPayslip.createdAt).toLocaleDateString()}
                  </div>
                  {/* <span className="payslip-status">GENERATED</span> */}

                <div className="payslip-actions">
                  <button
                    onClick={() => handleDownloadPayslip(displayPayslip._id)}
                    className="action-btns primary"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDeletePayslip(displayPayslip._id)}
                    className="action-btns danger"
                  >
                    Delete
                  </button>
                </div>
                </div>
              </div>
            ) : (
              <div className="no-current-payslip">
                <p>No payslip found for the selected filters</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
};
 
export default SalaryManagement;
 
 