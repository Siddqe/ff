import React, { useState, useEffect } from "react";
import { transactionService, typeOptions } from "../../services/transactions";
import { categoryService } from "../../services/categoryService";
import "./InOutTransactions.css";

const InOutTransactions = ({ onTransactionUpdate }) => {
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionCategories, setTransactionCategories] = useState({
    income: [],
    expense: []
  });
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    type: '',
    category: '',
    remarks: '',
    attachment: null,
  });
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    net: 0
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [incomeCategoryOptions, setIncomeCategoryOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [dateRange, setDateRange] = useState({
    fromDate: '',
    toDate: ''
  });

  // Check if any filters are active
  const areFiltersActive = () => {
    return filterType || filterCategory || search || dateRange.fromDate || dateRange.toDate;
  };

  // Get recent transactions (last 30 days)
  const getRecentTransactions = (transactionsList) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
   
    return transactionsList.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= thirtyDaysAgo;
    });
  };

  // Fetch all transactions from backend
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions();
      setAllTransactions(data.transactions || []);
      
      // Apply recent transactions filter by default (if no other filters)
      if (!areFiltersActive()) {
        const recentTransactions = getRecentTransactions(data.transactions || []);
        setTransactions(recentTransactions);
      } else {
        setTransactions(data.transactions || []);
      }
      
      setTotals(data.totals || { income: 0, expenses: 0, net: 0 });
      
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setErrorMessage('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters locally
  const applyFilters = () => {
    let filtered = allTransactions;

    // If no filters are active, show only recent transactions
    if (!areFiltersActive()) {
      filtered = getRecentTransactions(allTransactions);
    } else {
      // Apply date range filter
      if (dateRange.fromDate || dateRange.toDate) {
        filtered = filtered.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          transactionDate.setHours(0, 0, 0, 0);
          
          if (dateRange.fromDate && dateRange.toDate) {
            const fromDate = new Date(dateRange.fromDate);
            const toDate = new Date(dateRange.toDate);
            toDate.setHours(23, 59, 59, 999);
            return transactionDate >= fromDate && transactionDate <= toDate;
          } else if (dateRange.fromDate) {
            const fromDate = new Date(dateRange.fromDate);
            return transactionDate >= fromDate;
          } else if (dateRange.toDate) {
            const toDate = new Date(dateRange.toDate);
            toDate.setHours(23, 59, 59, 999);
            return transactionDate <= toDate;
          }
          return true;
        });
      }

      // Apply type filter
      if (filterType) {
        filtered = filtered.filter(transaction => transaction.type === filterType);
      }

      // Apply category filter
      if (filterCategory) {
        filtered = filtered.filter(transaction => transaction.category === filterCategory);
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(transaction =>
          transaction.description.toLowerCase().includes(searchLower) ||
          (transaction.remarks && transaction.remarks.toLowerCase().includes(searchLower))
        );
      }
    }

    setTransactions(filtered);
  };

  // Fetch transaction categories
  const fetchTransactionCategories = async () => {
    try {
      const response = await categoryService.getTransactionCategories();
      if (response.success) {
        setTransactionCategories(response.data);
        setIncomeCategoryOptions(response.data.income.map(cat => cat.name));
        setExpenseCategoryOptions(response.data.expense.map(cat => cat.name));
      }
    } catch (error) {
      console.error('Error fetching transaction categories:', error);
      setErrorMessage('Failed to load categories');
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
    fetchTransactionCategories();
  }, []);

  // Apply filters when any filter changes
  useEffect(() => {
    if (allTransactions.length > 0) {
      applyFilters();
    }
  }, [filterType, filterCategory, search, dateRange, allTransactions]);

  // Update category options when transaction type changes
  useEffect(() => {
    if (newTransaction.type === 'Income') {
      setCategoryOptions(transactionCategories.income.map(cat => cat.name));
    } else if (newTransaction.type === 'Expense') {
      setCategoryOptions(transactionCategories.expense.map(cat => cat.name));
    } else {
      setCategoryOptions([]);
    }
   
    if (newTransaction.type) {
      setNewTransaction(prev => ({ ...prev, category: '' }));
    }
  }, [newTransaction.type, transactionCategories]);

  // Handle filter type change
  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    setFilterCategory('');
  };

  // Handle date range input change
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilterType('');
    setFilterCategory('');
    setSearch('');
    setDateRange({
      fromDate: '',
      toDate: ''
    });
  };

  // Clear date range filter only
  const clearDateRangeFilter = () => {
    setDateRange({
      fromDate: '',
      toDate: ''
    });
  };

  // Open detail view modal
  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailModalOpen(true);
  };

  // Close detail view modal
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedTransaction(null);
  };

  // Download attachment
  const handleDownloadAttachment = async (transactionId, fileName) => {
    try {
      const response = await transactionService.downloadAttachment(transactionId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      setErrorMessage('Failed to download attachment');
    }
  };

  // Add new transaction
  const handleAddTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount || !newTransaction.type || !newTransaction.category) {
      setErrorMessage('Please fill in all required fields: Description, Amount, Type, and Category');
      return;
    }

    try {
      await transactionService.addTransaction(newTransaction);
      setSuccessMessage('Transaction added successfully!');
      setNewTransaction({
        description: '',
        amount: '',
        type: '',
        category: '',
        remarks: '',
        attachment: null
      });
      setOpen(false);
      fetchTransactions(); // Refresh the data
      if (onTransactionUpdate) {
        onTransactionUpdate();
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      setErrorMessage('Failed to add transaction');
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionService.deleteTransaction(transactionId);
        setSuccessMessage('Transaction deleted successfully');
        fetchTransactions(); // Refresh the data
        if (onTransactionUpdate) {
          onTransactionUpdate();
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        setErrorMessage('Failed to delete transaction');
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xlsx'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
     
      if (!allowedTypes.includes(fileExtension)) {
        setErrorMessage('Please select a valid file type: PDF, JPG, PNG, DOC, DOCX, XLSX');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('File size must be less than 5MB');
        return;
      }

      setNewTransaction({
        ...newTransaction,
        attachment: file
      });
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="iot-container">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="iot-alert success">
          {successMessage}
          <button onClick={() => setSuccessMessage('')} className="iot-close-alert">×</button>
        </div>
      )}
     
      {errorMessage && (
        <div className="iot-alert error">
          {errorMessage}
          <button onClick={() => setErrorMessage('')} className="iot-close-alert">×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="iot-summary-cards">
        <div className="iot-summary-card income">
          <div className="iot-card-icon">↑</div>
          <div className="iot-card-content">
            <h3>Total Income</h3>
            <div className="iot-amount">{formatCurrency(totals.income)}</div>
          </div>
        </div>
       
        <div className="iot-summary-card expense">
          <div className="iot-card-icon">↓</div>
          <div className="iot-card-content">
            <h3>Total Expenses</h3>
            <div className="iot-amount">{formatCurrency(totals.expenses)}</div>
          </div>
        </div>
       
        <div className="iot-summary-card net">
          <div className="iot-card-icon">📊</div>
          <div className="iot-card-content">
            <h3>Net Income</h3>
            <div className={`iot-amount ${totals.net >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(totals.net)}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Header */}
      <div className="iot-history-header">
        <h2>
          Transaction History ({transactions.length} records)
          {!areFiltersActive() && (
            <span className="iot-date-filter-badge" >
              Showing Last 30 Days
            </span>
          )}
          {(dateRange.fromDate || dateRange.toDate) && (
            <span className="iot-date-filter-badge">
              {dateRange.fromDate && dateRange.toDate 
                ? `From ${formatDate(dateRange.fromDate)} to ${formatDate(dateRange.toDate)}`
                : dateRange.fromDate 
                ? `From ${formatDate(dateRange.fromDate)}`
                : `To ${formatDate(dateRange.toDate)}`
              }
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {areFiltersActive() && (
            <button 
              className="iot-clear-all-filter-btn"
              onClick={clearAllFilters}
              style={{ background: '#6b7280', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px' }}
            >
              Clear All Filters
            </button>
          )}
          <button className="iot-add-transaction-btn" onClick={() => setOpen(true)}>
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="iot-filters-section">
        <input
          type="text"
          className="iot-search-input"
          placeholder="Search transactions or remarks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="iot-filter-select"
          value={filterType}
          onChange={handleFilterTypeChange}
        >
          <option value="">All Types</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select
          className="iot-filter-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {filterType === 'Income' && (
            <optgroup label="Income Categories">
              {incomeCategoryOptions.map((cat) => (
                <option key={`income-${cat}`} value={cat}>{cat}</option>
              ))}
            </optgroup>
          )}
          {filterType === 'Expense' && (
            <optgroup label="Expense Categories">
              {expenseCategoryOptions.map((cat) => (
                <option key={`expense-${cat}`} value={cat}>{cat}</option>
              ))}
            </optgroup>
          )}
          {!filterType && (
            <>
              <optgroup label="Income Categories">
                {incomeCategoryOptions.map((cat) => (
                  <option key={`income-${cat}`} value={cat}>{cat}</option>
                ))}
              </optgroup>
              <optgroup label="Expense Categories">
                {expenseCategoryOptions.map((cat) => (
                  <option key={`expense-${cat}`} value={cat}>{cat}</option>
                ))}
              </optgroup>
            </>
          )}
        </select>

        {/* Date Range Filter */}
        <div className="iot-date-range-filter">
          <div className="iot-date-input-group">
            <label>From Date</label>
            <input
              type="date"
              className="iot-date-input"
              value={dateRange.fromDate}
              onChange={(e) => handleDateRangeChange('fromDate', e.target.value)}
              max={dateRange.toDate || new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="iot-date-input-group">
            <label>To Date</label>
            <input
              type="date"
              className="iot-date-input"
              value={dateRange.toDate}
              onChange={(e) => handleDateRangeChange('toDate', e.target.value)}
              min={dateRange.fromDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          {(dateRange.fromDate || dateRange.toDate) && (
            <button 
              className="iot-clear-date-filter-btn"
              onClick={clearDateRangeFilter}
              title="Clear date filter"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Info Message */}


      {/* Transactions Table */}
      <div className="iot-table-container">
        {loading ? (
          <div className="iot-loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="iot-no-transactions">
            {areFiltersActive() ? (
              <p>No transactions found matching your filters.</p>
            ) : (
              <p>No recent transactions found in the last 30 days.</p>
            )}
          </div>
        ) : (
          <table className="iot-transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Remarks</th>
                <th>Attachment</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id} onClick={() => handleViewDetails(transaction)}>
                  <td>{formatDate(transaction.date)}</td>
                  <td className="iot-description-cell">{transaction.description}</td>
                  <td>
                    <span className={`iot-category-tag ${transaction.type.toLowerCase()}`}>
                      {transaction.category}
                    </span>
                  </td>
                  <td className={`iot-amount-cell ${transaction.type.toLowerCase()}`}>
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="iot-remarks-cell">
                    {transaction.remarks || 'No remarks'}
                  </td>
                  <td className="iot-attachment-cell">
                    {transaction.attachment ? (
                      <div className="iot-file-attachment">
                        <span className="iot-file-icon">📁</span>
                        <span className="iot-file-name">{transaction.attachment.originalName}</span>
                      </div>
                    ) : (
                      <span className="iot-no-file">No file</span>
                    )}
                  </td>
                  <td>
                    <span className={`iot-type-badge ${transaction.type.toLowerCase()}`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="iot-actions-cell">
                    <button
                      className="iot-action-btn iot-action-btn-view"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(transaction);
                      }}
                      title="View Details"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button
                      className="iot-action-btn iot-action-btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTransaction(transaction._id);
                      }}
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rest of the modals remain the same */}
      {/* Add Transaction Modal */}
      {open && (
        <div className="iot-modal-overlay">
          <div className="iot-modal-content">
            <div className="iot-modal-header">
              <h2>Add New Transaction</h2>
              <button className="iot-close-btn" onClick={() => setOpen(false)}>×</button>
            </div>
           
            <div className="iot-modal-body">
              <div className="iot-form-group">
                <label className="required">Description</label>
                <input
                  type="text"
                  className="iot-form-input"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  placeholder="Enter transaction description"
                  required
                />
              </div>

              <div className="iot-form-group">
                <label className="required">Amount</label>
                <input
                  type="number"
                  className="iot-form-input"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="iot-form-group">
                <label className="required">Type</label>
                <select
                  className="iot-form-select"
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  required
                >
                  <option value="">Select Type</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="iot-form-group">
                <label className="required">Category</label>
                <select
                  className="iot-form-select"
                  value={newTransaction.category}
                  onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                  required
                  disabled={!newTransaction.type}
                >
                  <option value="">
                    {newTransaction.type ? `Select ${newTransaction.type} Category` : 'Select Type First'}
                  </option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="iot-form-group">
                <label>Remarks</label>
                <textarea
                  className="iot-form-textarea"
                  value={newTransaction.remarks}
                  onChange={(e) => setNewTransaction({ ...newTransaction, remarks: e.target.value })}
                  rows="3"
                  placeholder="Add any additional notes or details..."
                />
              </div>

              <div className="iot-form-group">
                <label>Attach Receipt (Optional)</label>
                <div className="iot-file-upload-section">
                  <input
                    type="file"
                    id="iot-attachment-upload"
                    className="iot-file-input"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="iot-attachment-upload" className="iot-file-upload-label">
                    {newTransaction.attachment ? (
                      <>
                        <span className="iot-file-icon">📁</span>
                        <span>{newTransaction.attachment.name}</span>
                      </>
                    ) : (
                      'CHOOSE FILE (PDF, IMAGE, DOCUMENT)'
                    )}
                  </label>
                  <p className="iot-file-hint">Max file size: 5MB • Supported: PDF, JPG, PNG, DOC, XLSX</p>
                </div>
              </div>
            </div>

            <div className="iot-modal-actions">
              <button className="iot-btn-cancel" onClick={() => setOpen(false)}>
                CANCEL
              </button>
              <button
                className="iot-btn-primary"
                onClick={handleAddTransaction}
                disabled={!newTransaction.description || !newTransaction.amount || !newTransaction.type || !newTransaction.category}
              >
                ADD TRANSACTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {detailModalOpen && selectedTransaction && (
        <div className="iot-modal-overlay">
          <div className="iot-modal-content iot-details-modal">
            <div className="iot-modal-header">
              <h2>Transaction Details</h2>
              <p className="iot-read-only-note">Read Only - No editing allowed</p>
              <button className="iot-close-btn" onClick={handleCloseDetailModal}>×</button>
            </div>
           
            <div className="iot-modal-body">
              <div className="iot-details-grid">
                <div className="iot-details-column">
                  <div className="iot-detail-item">
                    <label>Date</label>
                    <p>{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div className="iot-detail-item">
                    <label>Description</label>
                    <p>{selectedTransaction.description}</p>
                  </div>
                  <div className="iot-detail-item">
                    <label>Category</label>
                    <span className={`iot-category-tag ${selectedTransaction.type.toLowerCase()}`}>
                      {selectedTransaction.category}
                    </span>
                  </div>
                  <div className="iot-detail-item">
                    <label>Type</label>
                    <span className={`iot-type-badge ${selectedTransaction.type.toLowerCase()}`}>
                      {selectedTransaction.type}
                    </span>
                  </div>
                </div>
               
                <div className="iot-details-column">
                  <div className="iot-detail-item">
                    <label>Amount</label>
                    <p className={`iot-amount-large ${selectedTransaction.type.toLowerCase()}`}>
                      {formatCurrency(selectedTransaction.amount)}
                    </p>
                  </div>
                  <div className="iot-detail-item">
                    <label>Attachment</label>
                    {selectedTransaction.attachment ? (
                      <div className="iot-attachment-details">
                        <span className="iot-file-icon">📁</span>
                        <span className="iot-file-name">{selectedTransaction.attachment.originalName}</span>
                        <button
                          className="iot-download-btn"
                          onClick={() => handleDownloadAttachment(selectedTransaction._id, selectedTransaction.attachment.originalName)}
                        >
                          Download
                        </button>
                      </div>
                    ) : (
                      <p className="iot-no-attachment">No attachment</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="iot-remarks-section">
                <label>Remarks</label>
                <div className="iot-remarks-box">
                  {selectedTransaction.remarks || 'No remarks provided'}
                </div>
              </div>
            </div>

            <div className="iot-modal-actions">
              <button className="iot-btn-primary full-width" onClick={handleCloseDetailModal}>
                CLOSE DETAILS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InOutTransactions;