import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeDashService } from '../../services/employeeDash';
import './employeeDashboard.css';
import { Navigate } from 'react-router-dom';
 
const EmployeeDashboard = () => {
  const { user , logout } = useAuth();
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [currentSalary, setCurrentSalary] = useState(null);
  const [salaryStats, setSalaryStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('salary');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
 
  useEffect(() => {
    if (user) {
      loadEmployeeData();
    }
  }, [user]);
 
 
 
  const handleLogout = () => {
    logout();
    Navigate('/admin/login');
  };
 
  const loadEmployeeData = async () => {
    try {
      setLoading(true);
     
      // Load all employee data in parallel
      const [
        profileResponse,
        payslipsResponse,
        salaryHistoryResponse,
        currentSalaryResponse,
        salaryStatsResponse
      ] = await Promise.all([
        employeeDashService.getEmployeeProfile(),
        employeeDashService.getEmployeePayslips(),
        employeeDashService.getSalaryHistory(),
        employeeDashService.getCurrentSalary(),
        employeeDashService.getSalaryStats()
      ]);
 
      setEmployeeDetails(profileResponse.employee);
      setPayslips(payslipsResponse.payslips || []);
      setSalaryHistory(salaryHistoryResponse.salaries || []);
      setCurrentSalary(currentSalaryResponse.currentSalary);
      setSalaryStats(salaryStatsResponse.stats);
 
    } catch (error) {
      console.error('Error loading employee data:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const handleDownloadPayslip = async (payslipId) => {
    try {
      // This would need to be implemented in your employeeDashService
      const blob = await employeeDashService.downloadPayslip(payslipId);
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
 
  const handleDownloadSalaryPayslip = async (salaryId) => {
  try {
    // Find the corresponding payslip for this salary record
    const correspondingPayslip = payslips.find(payslip =>
      payslip.month === salaryHistory.find(s => s._id === salaryId)?.month &&
      payslip.year === salaryHistory.find(s => s._id === salaryId)?.year
    );
 
    if (correspondingPayslip) {
      await handleDownloadPayslip(correspondingPayslip._id);
    } else {
      // If no direct match found, try to download using salary ID
      // You might need to implement a separate service method for this
      const blob = await employeeDashService.downloadPayslipBySalaryId(salaryId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `payslip-${salaryId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Error downloading salary payslip:', error);
    alert('Error downloading payslip. Please try again or contact HR.');
  }
};
 
  const handleViewPayslip = async (payslipId) => {
    try {
      const response = await employeeDashService.getPayslipDetails(payslipId);
      setSelectedPayslip(response.payslip);
      setShowPayslipModal(true);
    } catch (error) {
      alert('Error loading payslip details');
    }
  };
 
  // NEW FUNCTION: Handle viewing payslip from salary history
  const handleViewSalaryPayslip = async (salaryId) => {
    try {
      // Find the corresponding payslip for this salary record
      const salaryRecord = salaryHistory.find(s => s._id === salaryId);
      if (!salaryRecord) {
        alert('Salary record not found');
        return;
      }
 
      // Find matching payslip by month and year
      const correspondingPayslip = payslips.find(payslip =>
        payslip.month === salaryRecord.month &&
        payslip.year === salaryRecord.year
      );
 
      if (correspondingPayslip) {
        // If payslip exists, view it
        await handleViewPayslip(correspondingPayslip._id);
      }
    } catch (error) {
      console.error('Error viewing salary payslip:', error);
      alert('Error loading payslip details. Please try again.');
    }
  };
 
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };
 
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
 
  const getMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || monthNumber;
  };
 
  if (loading) {
    return (
      <div className="employee-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="employee-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {employeeDetails?.name || 'Employee'}! 👋</h1>
          <p>Here's your professional dashboard and salary information</p>
        </div>
        <div className="employee-badge">
          <div className="badge-avatar">
            {employeeDetails?.name?.charAt(0) || 'E'}
          </div>
          <div className="badge-info">
            <span className="employee-id">{employeeDetails?.employeeId}</span>
            <span className="employee-role">{employeeDetails?.designation}</span>
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
 
      {/* Navigation Tabs */}
      <div className="dashboard-tabs">
        {/* <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button> */}
        {/* <button
          className={`tab-button ${activeTab === 'payslips' ? 'active' : ''}`}
          onClick={() => setActiveTab('payslips')}
        >
          💰 Payslips
        </button> */}
        <button
          className={`tab-button ${activeTab === 'salary' ? 'active' : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          💵 Salary History
        </button>
        <button
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </div>
 
      {/* Content Area */}
      <div className="dashboard-content">
          
         {/* {activeTab === 'payslips' && (
          <div className="payslips-tab">
            <div className="content-section">
              <div className="section-header">
                <h3>All Payslips</h3>
                <span className="payslip-count">{payslips.length} payslips</span>
              </div>
             
              <div className="payslips-grid">
                {payslips.map((payslip) => (
                  <div key={payslip._id} className="payslip-card">
                    <div className="payslip-card-header">
                      <div className="payslip-info">
                        <h4>{payslip.month} {payslip.year}</h4>
                        <span className="payslip-id">#{payslip._id.slice(-8)}</span>
                      </div>
                      <div className="payslip-amount-main">
                        {formatCurrency(payslip.netPay)}
                      </div>
                    </div>
 
                    <div className="payslip-details">
                      <div className="detail-row">
                        <span>Gross Earnings:</span>
                        <span>{formatCurrency(payslip.grossEarnings)}</span>
                      </div>
                      <div className="detail-row">
                        <span>Total Deductions:</span>
                        <span className="text-danger">
                          -{formatCurrency(payslip.totalDeductions)}
                        </span>
                      </div>
                      <div className="detail-row total">
                        <span>Net Pay:</span>
                        <span className="net-pay">
                          {formatCurrency(payslip.netPay)}
                        </span>
                      </div>
                    </div>
 
                    <div className="payslip-card-footer">
                      <span className="payslip-date">
                        {payslip.payDate ? `Paid: ${formatDate(payslip.payDate)}` : `Generated: ${formatDate(payslip.createdAt)}`}
                      </span>
                      <div className="payslip-actions">
                        <button
                          className="action-btn primary"
                          onClick={() => handleViewPayslip(payslip._id)}
                        >
                          View Details
                        </button>
                        <button
                          className="action-btn success"
                          onClick={() => handleDownloadPayslip(payslip._id)}
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
               
                {payslips.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">💰</div>
                    <h4>No Payslips Found</h4>
                    <p>Your payslips will be available here once processed by the HR department.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}  */}
 
        {activeTab === 'salary' && (
          <div className="salary-tab">
            <div className="content-section">
              <div className="section-header">
                <h3>Salary History</h3>
                <span className="payslip-count">{payslips.length} records</span>
              </div>

{/* Salary History Table */}
<div className="salary-table-container">
  <table className="salary-table">
    <thead>
      <tr>
        <th>Period</th>
        <th>Status</th>
        <th>Pay Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {payslips.map((payslip) => (
        <tr key={payslip._id}>
          <td>
            <strong>{payslip.month} {payslip.year}</strong>
          </td>
          <td>
            <span className={`status-badge status-${'paid'}`}>
              {'Paid'}
            </span>
          </td>
          <td>
            {payslip.payDate ? formatDate(payslip.payDate) : 
             payslip.createdAt ? formatDate(payslip.createdAt) : 'Pending'}
          </td>
          <td>
            <div className="action-buttons">
              <button
                className="action-btns primary"
                onClick={() => handleViewPayslip(payslip._id)}
                title="View Details"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button
                className="action-btns success"
                onClick={() => handleDownloadPayslip(payslip._id)}
                title="Download Payslip"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      ))}
      {payslips.length === 0 && (
        <tr>
          <td colSpan="8" className="empty-table">
            <div className="empty-state">
              <div className="empty-icon">💵</div>
              <h4>No Payslip History</h4>
              <p>Your payslips will be available here once processed by the HR department.</p>
            </div>
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
            </div>
          </div>
        )}
 
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <div className="content-section">
              <h3>Professional Details</h3>
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {employeeDetails?.name?.charAt(0) || 'E'}
                  </div>
                  <div className="profile-info">
                    <h2>{employeeDetails?.name || 'N/A'}</h2>
                    <p>{employeeDetails?.designation || 'N/A'} • {employeeDetails?.department || 'N/A'}</p>
                  </div>
                </div>
 
                <div className="profile-details-grid">
                  <div className="detail-group">
                    <label>Employee ID</label>
                    <span>{employeeDetails?.employeeId || 'N/A'}</span>
                  </div>
                  <div className="detail-group">
                    <label>Email Address</label>
                    <span>{employeeDetails?.email || 'N/A'}</span>
                  </div>
                  <div className="detail-group">
                    <label>Phone Number</label>
                    <span>{employeeDetails?.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-group">
                    <label>Date of Joining</label>
                    <span>
                      {employeeDetails?.joiningDate ?
                        formatDate(employeeDetails.joiningDate) : 'N/A'
                      }
                    </span>
                  </div>
                  <div className="detail-group">
                    <label>Department</label>
                    <span>{employeeDetails?.department || 'N/A'}</span>
                  </div>
                  <div className="detail-group">
                    <label>Designation</label>
                    <span>{employeeDetails?.designation || 'N/A'}</span>
                  </div>
                  {/* Address Section */}
                  {/* Address Section - Structured with individual fields */}
                  <div className="detail-group full-width">
                    <label>Address</label>
                    <div className="address-details structured">
                      {employeeDetails?.address?.addressLine1 && (
                        <div className="address-line">
                          <span className="address-value">{employeeDetails.address.addressLine1 ? `${employeeDetails.address.addressLine1},` :''}</span>
                        </div>
                      )}
                      {employeeDetails?.address?.addressLine2 && (
                        <div className="address-line">
                          <span className="address-value">{employeeDetails.address.addressLine2? `${employeeDetails.address.addressLine2},` :''}</span>
                        </div>
                      )}
                      {(employeeDetails?.address?.city || employeeDetails?.address?.state || employeeDetails?.address?.pinCode) && (
                        <div className="address-line">
                          <span className="address-value">
                            {employeeDetails?.address?.city ? `${employeeDetails.address.city} ` : ''}
                            {employeeDetails?.address?.pinCode ? ` - ${employeeDetails.address.pinCode},` : ''}
                            {employeeDetails?.address?.state ? `${employeeDetails?.address?.state}.` : ''}
                          </span>
                        </div>
                      )}
                      {!employeeDetails?.address?.addressLine1 && !employeeDetails?.address?.addressLine2 && 
                      !employeeDetails?.address?.city && !employeeDetails?.address?.state && !employeeDetails?.address?.pinCode && (
                        <span>N/A</span>
                      )}
                    </div>
                  </div>
                  <div className="detail-group">
                    <label>Member Since</label>
                    <span>
                      {employeeDetails?.createdAt ?
                        formatDate(employeeDetails.createdAt) : 'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
 
      {/* Payslip Detail Modal */}
      {showPayslipModal && selectedPayslip && (
        <div className="modal-overlay" onClick={() => setShowPayslipModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payslip Details - {selectedPayslip.month} {selectedPayslip.year}</h3>
              <button
                className="close-btn"
                onClick={() => setShowPayslipModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="payslip-detail-view">
                <div className="payslip-header-detail">
                  <div className="company-info">
                    <h3>Your Company Name</h3>
                    <p>Payslip for {selectedPayslip.month} {selectedPayslip.year}</p>
                  </div>
                  <div className="employee-info-detail">
                    <p><strong>Employee:</strong> {employeeDetails?.name}</p>
                    <p><strong>ID:</strong> {employeeDetails?.employeeId}</p>
                    <p><strong>Designation:</strong> {employeeDetails?.designation}</p>
                  </div>
                </div>
 
                <div className="payslip-breakdown">
                  <div className="earnings-section">
                    <h4>Earnings</h4>
                    <div className="breakdown-row">
                      <span>Basic Salary</span>
                      <span>{formatCurrency(selectedPayslip.basicSalary)}</span>
                    </div>
                    {selectedPayslip.earnings?.map((earning, index) => (
                      <div key={index} className="breakdown-row">
                        <span>{earning.type}</span>
                        <span>{formatCurrency(earning.amount)}</span>
                      </div>
                    ))}
                    <div className="breakdown-row total">
                      <span>Total Earnings</span>
                      <span>{formatCurrency(selectedPayslip.grossEarnings)}</span>
                    </div>
                  </div>
 
                  <div className="deductions-section">
                    <h4>Deductions</h4>
                    {selectedPayslip.deductions?.map((deduction, index) => (
                      <div key={index} className="breakdown-row">
                        <span>{deduction.type}</span>
                        <span className="text-danger">
                          -{formatCurrency(deduction.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="breakdown-row total">
                      <span>Total Deductions</span>
                      <span className="text-danger">
                        -{formatCurrency(selectedPayslip.totalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
 
                <div className="payslip-summary">
                  <div className="net-pay-section">
                    <h3>Net Pay</h3>
                    <div className="net-pay-amount">
                      {formatCurrency(selectedPayslip.netPay)}
                    </div>
                  </div>
                </div>
 
                <div className="payslip-actions-modal">
                  <button
                    className="action-btns success"
                    onClick={() => handleDownloadPayslip(selectedPayslip._id)}
                  >
                    Download PDF
                  </button>
                  <button
                    className="action-btns"
                    onClick={() => setShowPayslipModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default EmployeeDashboard;