import React, { useState, useEffect } from 'react';
import {
  billingService,
  currencySymbols,
  currencyOptions,
  defaultInvoiceItem,
  formatCurrencyDisplay,
  checkInvoiceStatus,
  formatInvoiceAmount,
  calculateInvoiceTotals,
  validateFile,
  getDefaultDates
} from '../../services/invoice';
import './ReportsBilling.css';

// Add this custom hook for localStorage persistence (AT THE TOP LEVEL)
const usePersistedSentEmails = () => {
  const [sentEmails, setSentEmails] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sentInvoices');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  const updateSentEmails = (newSet) => {
    setSentEmails(newSet);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentInvoices', JSON.stringify([...newSet]));
    }
  };

  return [sentEmails, updateSentEmails];
};

const ReportsBilling = () => {
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sentEmails, setSentEmails] = usePersistedSentEmails();
  const [emailConfirmation, setEmailConfirmation] = useState({ show: false, invoice: null });

  const [disabledInvoices, setDisabledInvoices] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [items, setItems] = useState([{
    ...defaultInvoiceItem,
    description: "",
    remarks: "",
    unitPrice: "",
    quantity: "",
    amount: ""
  }]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxPercent, setTaxPercent] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showItemsTable, setShowItemsTable] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [transactionNumber, setTransactionNumber] = useState('');
  const [transactionProof, setTransactionProof] = useState(null);
  const [activeTab, setActiveTab] = useState('active');

  // Add these new states near your existing useState declarations
const [searchTerm, setSearchTerm] = useState('');
const [dateFilter, setDateFilter] = useState('all'); // 'all', 'today', 'thisWeek', 'thisMonth', 'custom'
const [customStartDate, setCustomStartDate] = useState('');
const [customEndDate, setCustomEndDate] = useState('');
const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'unpaid', 'overdue'
  // New states for Profit & Loss report
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // NEW: Dedicated function for due date calculation
  const calculateDueDate = (invoiceDate, paymentTerms) => {
    if (!paymentTerms || !invoiceDate) {
      return null;
    }
   
    const invoiceDateObj = new Date(invoiceDate);
    const dueDateObj = new Date(invoiceDateObj);
    dueDateObj.setDate(invoiceDateObj.getDate() + parseInt(paymentTerms));
   
    return dueDateObj.toISOString().split('T')[0];
  };
    const getDisplayStatus = (invoice) => {
    const today = new Date();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const invoiceDate = new Date(invoice.date);
   
    // If invoice is paid, show Paid
    if (invoice.status === 'paid') {
      return 'paid';
    }
   
    // Calculate 30 days from invoice date for overdue calculation
    const thirtyDaysFromInvoice = new Date(invoiceDate);
    thirtyDaysFromInvoice.setDate(invoiceDate.getDate() + 30);
   
    // Check if invoice is overdue
    const isOverdue = (dueDate && today > dueDate) || today > thirtyDaysFromInvoice;
   
    // For draft and sent invoices, determine display status
    if (invoice.status === 'draft' || invoice.status === 'sent') {
      if (isOverdue) {
        return 'overdue';
      } else {
        return 'unpaid';
      }
    }
   
    // Fallback to database status
    return invoice.status;
  };


  // Reset filters function
const resetFilters = () => {
  setSearchTerm('');
  setDateFilter('all');
  setStatusFilter('all');
  setCustomStartDate('');
  setCustomEndDate('');
};

  // Filter invoices based on search term, date, and status
const getFilteredInvoices = (invoicesList) => {
  return invoicesList.filter(invoice => {
    // Search term filter
    const matchesSearch = searchTerm === '' ||
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerId?.company?.toLowerCase().includes(searchTerm.toLowerCase());
 
    // Status filter
    const invoiceStatus = checkInvoiceStatus(invoice);
    const matchesStatus = statusFilter === 'all' || invoiceStatus === statusFilter;
 
    // Date filter
    const invoiceDate = new Date(invoice.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
   
    let matchesDate = true;
   
    switch (dateFilter) {
      case 'today':
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        matchesDate = invoiceDate >= todayStart && invoiceDate <= todayEnd;
        break;
     
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        matchesDate = invoiceDate >= weekStart && invoiceDate <= weekEnd;
        break;
     
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        matchesDate = invoiceDate >= monthStart && invoiceDate <= monthEnd;
        break;
     
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = invoiceDate >= start && invoiceDate <= end;
        }
        break;
     
      default: // 'all'
        matchesDate = true;
    }
 
    return matchesSearch && matchesStatus && matchesDate;
  });
};
 
 
// ✅ CORRECT ORDER - define functions FIRST
const getAllInvoices = () => {
  return invoices.sort((a, b) => new Date(b.date) - new Date(a.date));
};
 
const getDisabledInvoicesList = () => {
  return disabledInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));
};
 
// THEN use/call the functions AFTER they're defined
const filteredInvoices = getFilteredInvoices(getAllInvoices());
const filteredDisabledInvoices = getFilteredInvoices(getDisabledInvoicesList());


  // ENHANCED: Handle customer selection with payment terms calculation
  const handleCustomerChange = (customerId) => {
    setSelectedCustomer(customerId);
   
    if (!customerId) {
      setDueDate('');
      return;
    }
   
    // Find the selected customer to get payment terms
    const selectedCustomerData = customers.find(customer => customer._id === customerId);
   
    if (selectedCustomerData && selectedCustomerData.paymentTerms && invoiceDate) {
      // Auto-calculate due date based on payment terms
      const calculatedDueDate = calculateDueDate(invoiceDate, selectedCustomerData.paymentTerms);
      setDueDate(calculatedDueDate);
     
      console.log(`✅ Auto-calculated due date: ${calculatedDueDate} (${selectedCustomerData.paymentTerms} days from invoice date)`);
    } else if (selectedCustomerData && !invoiceDate) {
      // If no invoice date, clear due date but store customer for later calculation
      setDueDate('');
    }
  };

  // ENHANCED: Handle invoice date change with due date recalculation
  const handleInvoiceDateChange = (date) => {
    setInvoiceDate(date);
   
    // Recalculate due date if customer is selected and has payment terms
    if (selectedCustomer) {
      const selectedCustomerData = customers.find(customer => customer._id === selectedCustomer);
      if (selectedCustomerData && selectedCustomerData.paymentTerms && date) {
        const calculatedDueDate = calculateDueDate(date, selectedCustomerData.paymentTerms);
        setDueDate(calculatedDueDate);
       
        console.log(`✅ Re-calculated due date: ${calculatedDueDate} (${selectedCustomerData.paymentTerms} days from new invoice date)`);
      }
    }
  };

  // NEW: Handle due date manual input with validation
  const handleDueDateChange = (date) => {
    if (!selectedCustomer || !invoiceDate) {
      setDueDate(date);
      return;
    }

    const selectedCustomerData = customers.find(customer => customer._id === selectedCustomer);
    if (selectedCustomerData?.paymentTerms) {
      const calculatedDueDate = calculateDueDate(invoiceDate, selectedCustomerData.paymentTerms);
      const manualDueDate = new Date(date);
      const minDueDate = new Date(calculatedDueDate);

      if (manualDueDate < minDueDate) {
        // Show warning but allow user to proceed
        const shouldProceed = window.confirm(
          `The due date you entered is earlier than the calculated due date based on payment terms (${calculatedDueDate}). Do you want to proceed?`
        );
       
        if (!shouldProceed) {
          // Revert to calculated due date
          setDueDate(calculatedDueDate);
          return;
        }
      }
    }

    setDueDate(date);
  };

  // Load customers and invoices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const customersData = await billingService.getCustomers();
        setCustomers(customersData);

        const invoicesData = await billingService.getInvoices();
        setInvoices(invoicesData.filter(invoice => !invoice.isDisabled));

        const disabledInvoicesData = await billingService.getDisabledInvoices();
        setDisabledInvoices(disabledInvoicesData);

        // Set default dates with proper initialization
        const { today, firstDay } = getDefaultDates();
        setInvoiceDate(today || '');
        setStartDate(firstDay || '');
        setEndDate(today || '');
       
        // Initialize taxPercent as string
        setTaxPercent('0');
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error fetching data");
      }
    };

    fetchData();
  }, []);

  // Handle Profit & Loss Excel download
  const handleDownloadExcel = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setReportLoading(true);
    try {
      const response = await billingService.downloadProfitLossExcel(startDate, endDate);

      // Download Excel
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `profit-loss-report-${startDate}-to-${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
     
    } catch (error) {
      console.error('Error downloading Excel report:', error);
      alert('Error downloading Excel report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  // Handle invoice download
  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await billingService.downloadInvoice(invoiceId);

      // Download PDF
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading invoice:", error);
      alert("Error downloading invoice. Please try again.");
    }
  };

  // Function to view payment proof
  const handleViewPaymentProof = async (invoice) => {
    if (!invoice.paymentDetails?.proofFile?.fileUrl) {
      alert('No payment proof available');
      return;
    }

    try {
      // Construct the full URL to the payment proof
      const proofUrl = `http://localhost:5000${invoice.paymentDetails.proofFile.fileUrl}`;
     
      // Open the payment proof in a new tab
      window.open(proofUrl, '_blank');
    } catch (error) {
      console.error('Error viewing payment proof:', error);
      alert('Error viewing payment proof');
    }
  };

  // ENHANCED: Open edit invoice modal with due date calculation
  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setSelectedCustomer(invoice.customerId._id);
    setItems(invoice.items.map(item => ({
      description: item.description || "",
      remarks: item.remarks || "",
      unitPrice: item.unitPrice ? item.unitPrice.toString() : "",
      quantity: item.quantity ? item.quantity.toString() : "",
      amount: item.amount ? item.amount.toString() : ""
    })));
   
    const invoiceDateValue = new Date(invoice.date).toISOString().split('T')[0];
    setInvoiceDate(invoiceDateValue);
   
    // Calculate due date based on customer's payment terms for edit mode
    const customer = customers.find(c => c._id === invoice.customerId._id);
    if (customer && customer.paymentTerms) {
      const calculatedDueDate = calculateDueDate(invoiceDateValue, customer.paymentTerms);
      setDueDate(calculatedDueDate);
      console.log(`✅ Auto-calculated due date for edit: ${calculatedDueDate} (${customer.paymentTerms} days)`);
    } else {
      setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
    }
   
    setTaxPercent(invoice.taxPercent ? invoice.taxPercent.toString() : '0');
    setNotes(invoice.notes || '');
    setCurrency(invoice.currency || 'USD');
    setShowItemsTable(true);
    setShowEditModal(true);
  };

  // Handle update invoice with better error handling
  const handleUpdateInvoice = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer.");
      return;
    }

    // Validate items with new fields
    const invalidItems = items.some((item) =>
      !item.description.trim() ||
      !item.unitPrice ||
      parseFloat(item.unitPrice) <= 0 ||
      !item.quantity ||
      parseFloat(item.quantity) <= 0
    );
   
    if (invalidItems) {
      alert("Please enter valid item descriptions, unit prices, and quantities.");
      return;
    }

    // Validate dates
    if (!invoiceDate) {
      alert("Please select an invoice date.");
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        customerId: selectedCustomer,
        items: items.map((item) => ({
          description: item.description,
          remarks: item.remarks || "",
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })),
        invoiceDate,
        dueDate: dueDate || null,
        taxPercent: Number(taxPercent) || 0,
        notes: notes || '',
        currency: currency,
      };

      console.log('Updating invoice data:', invoiceData);

      await billingService.updateInvoice(editingInvoice._id, invoiceData);
     
      alert("Invoice updated successfully!");
     
      // Refresh invoices list
      const invoicesData = await billingService.getInvoices();
      setInvoices(invoicesData.filter(invoice => !invoice.isDisabled));
     
      // Close modal and reset form
      closeEditModal();
    } catch (error) {
      console.error("Error updating invoice:", error);
      console.error("Error details:", error.response?.data);
      alert(`Error updating invoice: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingInvoice(null);
    setItems([{
      ...defaultInvoiceItem,
      description: "",
      remarks: "",
      unitPrice: "",
      quantity: "",
      amount: ""
    }]);
    setSelectedCustomer('');
    setNotes("");
    setTaxPercent('0');
    setCurrency('USD');
    setShowItemsTable(false);
  };

  // Disable invoice (move to disabled)
  const handleDisableInvoice = async (invoiceId) => {
    if (window.confirm('Are you sure you want to move this invoice to disabled invoices?')) {
      try {
        await billingService.disableInvoice(invoiceId);
        // Update local state
        const invoiceToDisable = invoices.find(invoice => invoice._id === invoiceId);
        setInvoices(invoices.filter(invoice => invoice._id !== invoiceId));
        setDisabledInvoices([...disabledInvoices, { ...invoiceToDisable, isDisabled: true }]);
        alert('Invoice moved to disabled invoices');
      } catch (error) {
        console.error("Error disabling invoice:", error);
        alert("Error disabling invoice. Please try again.");
      }
    }
  };

  // Restore disabled invoice
  const handleRestoreInvoice = async (invoiceId) => {
    try {
      await billingService.restoreInvoice(invoiceId);
      // Update local state
      const invoiceToRestore = disabledInvoices.find(invoice => invoice._id === invoiceId);
      setDisabledInvoices(disabledInvoices.filter(invoice => invoice._id !== invoiceId));
      setInvoices([...invoices, { ...invoiceToRestore, isDisabled: false }]);
      alert('Invoice restored successfully');
    } catch (error) {
      console.error("Error restoring invoice:", error);
      alert("Error restoring invoice. Please try again.");
    }
  };

  // Permanently delete invoice
  const handlePermanentDelete = async (invoiceId) => {
    if (window.confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) {
      try {
        await billingService.permanentDeleteInvoice(invoiceId);
        // Remove from local state
        setDisabledInvoices(disabledInvoices.filter(invoice => invoice._id !== invoiceId));
        alert('Invoice permanently deleted');
      } catch (error) {
        console.error("Error permanently deleting invoice:", error);
        alert("Error deleting invoice. Please try again.");
      }
    }
  };

  // Open payment verification modal
  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  // Close payment verification modal
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setTransactionNumber('');
    setTransactionProof(null);
  };

  // Handle file upload for transaction proof
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateFile(file, 10);
        setTransactionProof(file);
      } catch (error) {
        alert(error.message);
      }
    }
  };

  // Handle payment verification
  const handleVerifyPayment = async () => {
    if (!transactionNumber.trim()) {
      alert('Please enter a transaction number');
      return;
    }

    if (!transactionProof) {
      alert('Please upload proof of transaction');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        invoiceId: selectedInvoice._id,
        transactionNumber,
        transactionProof
      };

      const result = await billingService.verifyPayment(paymentData);

      // Update invoice with complete data including payment details AND status
      setInvoices(invoices.map(inv =>
        inv._id === selectedInvoice._id
          ? {
              ...result.invoice,
              status: 'paid'
            }
          : inv
      ));

      // Refresh transactions to show the new automatic entry
      try {
        const { transactionService } = await import('../../services/transactions');
        await transactionService.getTransactions({});
        console.log('✅ Transactions refreshed after invoice verification');
      } catch (refreshError) {
        console.log('ℹ️ Transaction refresh not available in this context');
      }

      alert('Payment verified successfully!');
      closePaymentModal();
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add / Remove / Edit items with auto-calculation
  const handleAddItem = () => {
    const newItem = {
      ...defaultInvoiceItem,
      description: "",
      remarks: "",
      unitPrice: "",
      quantity: "",
      amount: ""
    };
    setItems([...items, newItem]);
    setShowItemsTable(true);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    if (newItems.length === 0) {
      setShowItemsTable(false);
    }
  };

  // Handle item changes with auto-calculation
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount when unitPrice or quantity changes
    if (field === 'unitPrice' || field === 'quantity') {
      const unitPrice = parseFloat(newItems[index].unitPrice) || 0;
      const quantity = parseFloat(newItems[index].quantity) || 0;
      newItems[index].amount = (unitPrice * quantity).toFixed(2);
    }

    setItems(newItems);
  };

  // Total calculation using service function with new fields
  const totals = calculateInvoiceTotals(items, taxPercent, currency);

  // Open invoice modal
  const openInvoiceModal = () => {
    setShowInvoiceModal(true);
  };

  // Close invoice modal and reset form
  const closeInvoiceModal = () => {
    setShowInvoiceModal(false);
    setItems([{
      ...defaultInvoiceItem,
      description: "",
      remarks: "",
      unitPrice: "",
      quantity: "",
      amount: ""
    }]);
    setSelectedCustomer('');
    setNotes("");
    setTaxPercent('0');
    setCurrency('USD');
    setShowItemsTable(false);
  };

  // Handle confirmed email sending with proper backend tracking
// ENHANCED: Handle email sending with automatic PDF download
// ENHANCED: Handle email sending with automatic PDF attachment
const handleConfirmSendEmail = async () => {
  const { invoice } = emailConfirmation;
 
  if (!invoice) {
    setEmailConfirmation({ show: false, invoice: null });
    return;
  }

  const customerEmail = invoice.customerId?.email; // ✅ Define customerEmail here
 
  if (!customerEmail) {
    alert('Customer email not found');
    setEmailConfirmation({ show: false, invoice: null });
    return;
  }

  setSendingEmail(true);

  try {
    // Step 1: Download the PDF as blob
    const pdfBlob = await billingService.downloadInvoiceBlob(invoice._id);
   
    // Step 2: Create object URL from blob
    const pdfBlobUrl = URL.createObjectURL(pdfBlob);
   
    // Step 3: Generate email details
    const invoiceNumber = invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6).toUpperCase()}`;
    const customerName = invoice.customerId?.name || 'Customer';
    const invoiceAmount = `${currencySymbols[invoice.currency] || '$'}${formatInvoiceAmount(invoice)}`;
    const invoiceDate = new Date(invoice.date).toLocaleDateString();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';
    const status = checkInvoiceStatus(invoice);
   
    const subject = `Invoice ${invoiceNumber} from Your Company`;
    const body = `Dear ${customerName},\n\nPlease find your invoice details below:\n\nInvoice Number: ${invoiceNumber}\nDate: ${invoiceDate}\nDue Date: ${dueDate}\nAmount: ${invoiceAmount}\nStatus: ${status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Unpaid'}\n\nPlease find the detailed invoice attached.\n\nThank you for your business!\n\nBest regards,\nYour Company Team`;

    // Step 4: Create a temporary link to trigger Outlook with attachment
    const outlookUrl = generateOutlookUrl(customerEmail, subject, body, pdfBlob, `Invoice-${invoiceNumber}.pdf`);
   
    // Step 5: Open Outlook
    openOutlookWithAttachment(outlookUrl, pdfBlobUrl);

    // Step 6: Update backend and UI state
    await updateInvoiceEmailStatus(invoice._id, invoice);
   
    // Step 7: Update local state
    updateLocalInvoiceState(invoice._id);
   
    console.log('✅ Outlook opened with PDF attachment ready');

  } catch (error) {
    console.error('Error preparing email with attachment:', error);
   
    // ✅ FIX: Use the customerEmail that's defined at the top
    const fallbackSuccess = await openOutlookFallback(invoice, customerEmail);
    if (fallbackSuccess) {
      updateLocalInvoiceState(invoice._id);
    }
  } finally {
    setSendingEmail(false);
    setEmailConfirmation({ show: false, invoice: null });
  }
};

// Helper function to generate Outlook URL with attachment
const generateOutlookUrl = (toEmail, subject, body, pdfBlob, fileName) => {
  // Method 1: Using Outlook's deep link (limited attachment support)
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
 
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(toEmail)}&subject=${encodedSubject}&body=${encodedBody}`;
};

// Helper function to open Outlook with attachment using different methods
const openOutlookWithAttachment = (outlookUrl, pdfBlobUrl) => {
  // Method 1: Try Outlook Web App first
  const outlookWindow = window.open(outlookUrl, '_blank', 'width=1000,height=700');
 
  if (outlookWindow) {
    // Wait for window to load and try to attach file (limited by browser security)
    setTimeout(() => {
      // Note: Automatic attachment in web Outlook is limited due to security restrictions
      // The PDF will be available for manual attachment via the download
      console.log('Outlook opened. User can manually attach the downloaded PDF.');
    }, 2000);
  } else {
    // Method 2: Fallback to mailto with download hint
    const mailtoUrl = `mailto:${outlookUrl.split('to=')[1]?.split('&')[0]}?subject=${outlookUrl.split('subject=')[1]?.split('&')[0]}&body=${outlookUrl.split('body=')[1]}`;
    window.location.href = mailtoUrl;
  }
};

// Fallback method without automatic attachment
const openOutlookFallback = async (invoice, customerEmail) => {
  try {
    // Download PDF first
    await handleDownloadInvoice(invoice._id);
   
    // Then open Outlook with pre-filled details
    const invoiceNumber = invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6).toUpperCase()}`;
    const customerName = invoice.customerId?.name || 'Customer';
    const invoiceAmount = `${currencySymbols[invoice.currency] || '$'}${formatInvoiceAmount(invoice)}`;
    const invoiceDate = new Date(invoice.date).toLocaleDateString();
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';
    const status = checkInvoiceStatus(invoice);
   
    const subject = `Invoice ${invoiceNumber} from Your Company`;
    const body = `Dear ${customerName},\n\nPlease find your invoice details below:\n\nInvoice Number: ${invoiceNumber}\nDate: ${invoiceDate}\nDue Date: ${dueDate}\nAmount: ${invoiceAmount}\nStatus: ${status === 'paid' ? 'Paid' : status === 'overdue' ? 'Overdue' : 'Unpaid'}\n\nPlease attach the downloaded PDF invoice to this email.\n\nThank you for your business!\n\nBest regards,\nYour Company Team`;

    const outlookUrls = [
      `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(customerEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
      `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(customerEmail)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    ];

    const outlookWindow = window.open(outlookUrls[0], '_blank', 'width=800,height=600');
   
    if (!outlookWindow || outlookWindow.closed) {
      window.open(outlookUrls[1], '_blank');
    }
   
    return true;
  } catch (error) {
    console.error('Fallback method failed:', error);
    return false;
  }
};

// Update invoice status in backend
const updateInvoiceEmailStatus = async (invoiceId,invoice) => {
  try {
    const updateData = {
      status: 'sent',
      emailSent: true,
      emailSentAt: new Date(),
      customerId: invoice.customerId._id,
      items: invoice.items.map(item => ({
        description: item.description,
        remarks: item.remarks || "",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        amount: item.amount
      })),
      totalAmount: invoice.totalAmount,
      invoiceDate: invoice.date,
      dueDate: invoice.dueDate,
      taxPercent: invoice.taxPercent || 0,
      notes: invoice.notes || '',
      currency: invoice.currency || 'USD'
    };

    await billingService.updateInvoice(invoiceId, updateData);
  } catch (error) {
    console.error('Error updating invoice status:', error);
  }
};

// Update local UI state
// Update local UI state
const updateLocalInvoiceState = (invoiceId) => {
  setInvoices(prevInvoices =>
    prevInvoices.map(inv =>
      inv._id === invoiceId
        ? {
            ...inv,
            status: 'sent', // UPDATE STATUS TO 'sent'
            emailSent: true,
            emailSentAt: new Date()
          }
        : inv
    )
  );
 
  setSentEmails(prev => {
    const newSet = new Set(prev).add(invoiceId);
    localStorage.setItem('sentInvoices', JSON.stringify([...newSet]));
    return newSet;
  });
};
  // Invoice generation with new fields and better error handling
  const handleGenerateInvoice = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer.");
      return;
    }

    // Validate items with new fields
    const invalidItems = items.some((item) =>
      !item.description.trim() ||
      !item.unitPrice ||
      parseFloat(item.unitPrice) <= 0 ||
      !item.quantity ||
      parseFloat(item.quantity) <= 0
    );
   
    if (invalidItems) {
      alert("Please enter valid item descriptions, unit prices, and quantities.");
      return;
    }

    // Validate dates
    if (!invoiceDate) {
      alert("Please select an invoice date.");
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        customerId: selectedCustomer,
        items: items.map((item) => ({
          description: item.description,
          remarks: item.remarks || "",
          unitPrice: Number(item.unitPrice),
          quantity: Number(item.quantity),
        })),
        invoiceDate,
        dueDate: dueDate || null, // Allow null if no due date
        taxPercent: Number(taxPercent) || 0,
        notes: notes || '',
        currency: currency,
      };

      console.log('Sending invoice data:', invoiceData);

      const response = await billingService.generateInvoice(invoiceData);

      // Download PDF
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("Invoice generated successfully!");
     
      // Refresh invoices list
      const invoicesData = await billingService.getInvoices();
      setInvoices(invoicesData.filter(invoice => !invoice.isDisabled));
     
      // Close modal and reset form
      closeInvoiceModal();
    } catch (error) {
      console.error("Error generating invoice:", error);
      let errorMessage = "Error generating invoice. Please try again.";
   
    if (error.response?.status === 404) {
      errorMessage = error.response.data?.message || "Company information not found. Please set up company details first.";
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
      alert(`Error generating invoice: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle sending email with confirmation popup
  const handleSendEmail = async (invoice) => {
    // Show confirmation popup first
    setEmailConfirmation({ show: true, invoice });
  };

  // Handle cancel email sending
  const handleCancelSendEmail = () => {
    setEmailConfirmation({ show: false, invoice: null });
  };

  // Get payment terms info for current customer
  const getCurrentCustomerPaymentTerms = () => {
    if (!selectedCustomer) return null;
    const customer = customers.find(c => c._id === selectedCustomer);
    return customer?.paymentTerms;
  };

  return (
    <div className="reports-billing-container">
      {/* Main Content Grid */}
      <div className="main-content-grid">
        {/* Top Section with Profit & Loss */}
        <div className="profit-loss-section">
          <div className="form-section">
            <div className="card-header">
              <h3>Profit & Loss Report</h3>
            </div>
            <div className="form-field">
              <label>Date Range</label>
              <div className="date-range">
                <input
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span>to</span>
                <input
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
           
            <div className="export-buttons">
              <button
                className="export-btn excel"
                onClick={handleDownloadExcel}
                disabled={reportLoading || !startDate || !endDate}
              >
                {reportLoading ? 'Generating...' : 'Excel'}
              </button>
            </div>
          </div>
        </div>
     {/* FILTER SECTION - COMPACT VERSION */}
        <div className="filters-section standalone-filters compact">
          <div className="filter-controls">
            {/* Search Filter */}
            <div className="filter-group search-group">
              <label className="filter-label">Search</label>
              <input
                type="text"
                className="filter-inputs search-inputs"
                placeholder="Search by invoice number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
 
            {/* Status Filter */}
            <div className="filter-group status-group">
              <label className="filter-label">Status</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
 
            {/* Date Filter */}
            <div className="filter-group date-group">
              <label className="filter-label">Date Range</label>
              <select
                className="filter-select"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
 
            {/* Custom Date Range - Only show when custom is selected */}
            {dateFilter === 'custom' && (
              <>
                <div className="filter-group custom-date-group">
                  <label className="filter-label">From</label>
                  <input
                    type="date"
                    className="filter-inputs date-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="filter-group custom-date-group">
                  <label className="filter-label">To</label>
                  <input
                    type="date"
                    className="filter-inputs date-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
 
            {/* Reset Filters Button */}
            <div className="filter-group reset-group">
              <label className="filter-label">&nbsp;</label>
              <button
                className="reset-filters-btn"
                onClick={resetFilters}
                title="Reset all filters"
              >
                Reset
              </button>
            </div>
          </div>
 
          {/* Results Count */}
          <div className="filter-results">
            Showing {activeTab === 'active' ? filteredInvoices.length : filteredDisabledInvoices.length}
            of {activeTab === 'active' ? getAllInvoices().length : getDisabledInvoicesList().length} invoices
          </div>
        </div>  

        {/* Invoice History / Disabled Invoices */}
        <div className="report-card invoice-history-card">
          <div className="card-header responsive-header">
            <div className="tab-navigation">
              <button
                className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Invoice History
              </button>
              <button
                className={`tab-button ${activeTab === 'disabled' ? 'active' : ''}`}
                onClick={() => setActiveTab('disabled')}
              >
                Disabled Invoices
              </button>
            </div>
            <button className="generate-invoice-main-btn" onClick={openInvoiceModal}>
              Generate New Invoice
            </button>
          </div>
         
          <div className="invoice-history-table responsive-table-container">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th className="column-invoice">Invoice Number</th>
                  <th className="column-customer">Customer</th>
                  <th className="column-date">Date</th>
                  <th className="column-status">Status</th>
                  <th className="column-amount">Amount</th>
                  <th className="column-actions">Actions</th>
                </tr>
              </thead>

                      {/* REPLACE THE ENTIRE EXISTING TBODY WITH THIS FILTERED VERSION */}
    <tbody>
      {activeTab === 'active' ? (
        // Active Invoices - use filteredInvoices instead of getAllInvoices()
        filteredInvoices.length > 0 ? (
          filteredInvoices.map(invoice => {
            const status = checkInvoiceStatus(invoice);
            return (
              <tr key={invoice._id}>
                <td className="invoice-number" data-label="Invoice Number">
                  {invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6).toUpperCase()}`}
                </td>
                <td className="customer-info" data-label="Customer">
                  <div className="customer-name">{invoice.customerId?.name || 'N/A'}</div>
                  <div className="customer-id">{invoice.customerId?.customerId || ''}</div>
                </td>
                <td className="invoice-date" data-label="Date">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="invoice-status" data-label="Status">
                  <span className={`status-badge ${checkInvoiceStatus(invoice)}`}>
                    {checkInvoiceStatus(invoice) === 'overdue' ? 'Overdue' :
                     checkInvoiceStatus(invoice) === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className="amount" data-label="Amount">
                  {currencySymbols[invoice.currency] || '$'}{formatInvoiceAmount(invoice)}
                </td>
                <td className="invoice-actions" data-label="Actions">
                  <div className="inv-action-buttons responsive-actions">
                    {/* Send Email Button - Only show for invoices that haven't been sent */}
                    {invoice.status !== 'paid' && !invoice.emailSent && !sentEmails.has(invoice._id) && (
                      <button
                        className="inv-action-btn send"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendEmail(invoice);
                        }}
                        title="Send via Email"
                        disabled={sendingEmail}
                      >
                        {sendingEmail ? (
                          <span className="loading-spinner"></span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                        )}
                      </button>
                    )}
 
                    {/* Show tick mark for invoices that have been sent */}
                    {(invoice.emailSent || sentEmails.has(invoice._id)) && (
                      <button
                        className="inv-action-btn sent"
                        title="Email Already Sent"
                        disabled
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" stroke="#10B981" fill="none"/>
                        </svg>
                      </button>
                    )}
                   
                    {/* Edit Button */}
                    <button
                      className={`inv-action-btn edit ${(invoice.status === 'paid' || invoice.emailSent || sentEmails.has(invoice._id)) ? 'disabled' : ''}`}
                      onClick={(e) => {
                        if (invoice.status !== 'paid' && !invoice.emailSent && !sentEmails.has(invoice._id)) {
                          e.stopPropagation();
                          handleEditInvoice(invoice);
                        }
                      }}
                      title={
                        invoice.status === 'paid' ?
                          'Cannot edit paid invoices' :
                        invoice.emailSent || sentEmails.has(invoice._id) ?
                          'Cannot edit invoices that have been sent' :
                          'Edit Invoice'
                      }
                      disabled={invoice.status === 'paid' || invoice.emailSent || sentEmails.has(invoice._id)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                   
                    {/* Download Button */}
                    <button
                      className="inv-action-btn download"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadInvoice(invoice._id);
                      }}
                      title="Download Invoice"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </button>
                   
                    {/* View Payment Proof Button */}
                    {invoice.status === 'paid' && invoice.paymentDetails?.proofFile && (
                      <button
                        className="inv-action-btn view-proof"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewPaymentProof(invoice);
                        }}
                        title="View Payment Proof"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                    )}
                   
                    {/* Verify Payment Button */}
                    {invoice.status !== 'paid' && (
                      <button
                        className="inv-action-btn verify-payment"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPaymentModal(invoice);
                        }}
                        title="Verify Payment"
                      >
                        Verify
                      </button>
                    )}
                   
                    <button
                      className="inv-action-btn disable"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisableInvoice(invoice._id);
                      }}
                      title="Disable Invoice"
                    >
                      Disable
                    </button>
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="6" className="no-data-message">
              No invoices found matching your filters
            </td>
          </tr>
        )
      ) : (
        // Disabled Invoices - use filteredDisabledInvoices instead of getDisabledInvoicesList()
        filteredDisabledInvoices.length > 0 ? (
          filteredDisabledInvoices.map(invoice => {
            const status = checkInvoiceStatus(invoice);
            return (
              <tr key={invoice._id} className="disabled-row">
                <td className="invoice-number" data-label="Invoice Number">
                  {invoice.invoiceNumber || `INV-${invoice._id.toString().slice(-6).toUpperCase()}`}
                </td>
                <td className="customer-info" data-label="Customer">
                  <div className="customer-name">{invoice.customerId?.name || 'N/A'}</div>
                  <div className="customer-id">{invoice.customerId?.customerId || ''}</div>
                </td>
                <td className="invoice-date" data-label="Date">
                  {new Date(invoice.date).toLocaleDateString()}
                </td>
                <td className="invoice-status" data-label="Status">
                  <span className={`status-badge ${status} disabled`}>
                    {status === 'overdue' ? 'Overdue' :
                     status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </td>
                <td className="amount" data-label="Amount">
                  {currencySymbols[invoice.currency] || '$'}{formatInvoiceAmount(invoice)}
                </td>
                <td className="invoice-actions" data-label="Actions">
                  <div className="inv-action-buttons responsive-actions">
                    <button
                      className="inv-action-btn restore"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreInvoice(invoice._id);
                      }}
                      title="Restore Invoice"
                    >
                      Restore
                    </button>
                   
                    <button
                      className="inv-action-btn permanent-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePermanentDelete(invoice._id);
                      }}
                      title="Permanently Delete"
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
            );
          })
        ) : (
          <tr>
            <td colSpan="6" className="no-data-message">
              No disabled invoices found matching your filters
            </td>
          </tr>
        )
      )}
    </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Generation Modal */}
      {showInvoiceModal && (
        <div className="modal-overlay" onClick={closeInvoiceModal}>
          <div className="modal-content responsive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generate New Invoice</h2>
              <button className="close-modal-btn" onClick={closeInvoiceModal}>
                ×
              </button>
            </div>
           
            <div className="modal-body">
              <div className="report-card invoice-generation-card">
                <div className="card-header">
                  <h3>Invoice Details</h3>
                  <p>Create and manage customer invoices</p>
                </div>
               
                <div className="form-section">
                  {/* ENHANCED: Customer selection with payment terms */}
                  <div className="form-field">
                    <label className="required">Select Customer</label>
                    <select
                      className="form-select"
                      value={selectedCustomer}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      required
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name} {customer.company ? `- ${customer.company}` : ""}
                          {customer.paymentTerms ? ` (${customer.paymentTerms} days)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                 
                  <div className="form-grid-2 responsive-form-grid">
                    {/* ENHANCED: Invoice date with auto-calculation */}
                    <div className="form-field">
                      <label className="required">Invoice Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={invoiceDate}
                        onChange={(e) => handleInvoiceDateChange(e.target.value)}
                      />
                    </div>
                   
                    {/* ENHANCED: Due date field with auto-calculation and validation */}
                    <div className="form-field">
                      <label>Due Date {getCurrentCustomerPaymentTerms() && `(Auto-calculated: ${getCurrentCustomerPaymentTerms()} days)`}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={dueDate}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        placeholder="Auto-calculated from payment terms"
                      />
                      {selectedCustomer && getCurrentCustomerPaymentTerms() && (
                        <div className="due-date-info">
                          <small>
                            Based on {getCurrentCustomerPaymentTerms()} days payment terms
                            {dueDate && ` • Calculated: ${calculateDueDate(invoiceDate, getCurrentCustomerPaymentTerms())}`}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Currency</label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {currencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Tax (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                 
                  {/* Items Section with new fields */}
                  <div className="invoice-items-section">
                    <div className="section-header">
                      <label className="required">Invoice Items</label>
                      <button onClick={handleAddItem} className="add-item-btn">
                        + Add Item
                      </button>
                    </div>
                   
                    {showItemsTable && (
                      <div className="invoice-items-table responsive-table-container">
                        <table className="responsive-table">
                          <thead>
                            <tr>
                              <th className="column-description">Description</th>
                              <th className="column-remarks">Remarks</th>
                              <th className="column-unit-price">Unit Price ({currencySymbols[currency]})</th>
                              <th className="column-quantity">Quantity</th>
                              <th className="column-amount">Amount ({currencySymbols[currency]})</th>
                              <th className="column-action">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index}>
                                <td data-label="Description">
                                  <input
                                    type="text"
                                    placeholder="Item description"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                    className="table-input"
                                    required
                                  />
                                </td>
                                <td data-label="Remarks">
                                  <input
                                    type="text"
                                    placeholder="Additional remarks"
                                    value={item.remarks}
                                    onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                                    className="table-input remarks-input"
                                  />
                                </td>
                                <td data-label={`Unit Price (${currencySymbols[currency]})`}>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                    className="table-input"
                                    min="0"
                                    step="0.01"
                                    required
                                  />
                                </td>
                                <td data-label="Quantity">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                    className="table-input"
                                    min="0"
                                    step="1"
                                    required
                                  />
                                </td>
                                <td data-label={`Amount (${currencySymbols[currency]})`}>
                                  <input
                                    type="text"
                                    value={item.amount || '0.00'}
                                    className="table-input amount-input"
                                    readOnly
                                  />
                                </td>
                                <td data-label="Action">
                                  {items.length > 1 && (
                                    <button
                                      className="remove-btn"
                                      onClick={() => handleRemoveItem(index)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Totals Summary */}
                  {showItemsTable && (
                    <div className="totals-summary">
                      <div className="summary-line">
                        <span>Subtotal:</span>
                        <span>{currencySymbols[currency]}{totals.formattedSubtotal}</span>
                      </div>
                      {taxPercent > 0 && (
                        <div className="summary-line">
                          <span>Tax ({taxPercent}%):</span>
                          <span>{currencySymbols[currency]}{totals.formattedTaxAmount}</span>
                        </div>
                      )}
                      <div className="summary-total">
                        <span>Grand Total:</span>
                        <span>{currencySymbols[currency]}{totals.formattedTotal}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="form-field">
                    <label>Additional Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Any additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                    />
                  </div>
                 
                  <button
                    className="generate-invoice-btn"
                    onClick={handleGenerateInvoice}
                    disabled={loading}
                  >
                    {loading ? "Generating..." : "Generate & Download PDF"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Modal */}
      {emailConfirmation.show && emailConfirmation.invoice && (
        <div className="modal-overlay" onClick={handleCancelSendEmail}>
          <div className="modal-content email-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="report-card confirmation-card">
                <div className="card-header">
                  <h3>Confirm Email</h3>
                </div>
               
                <div className="confirmation-content">
                  <p>Are you sure you want to send the invoice <strong>{emailConfirmation.invoice.invoiceNumber}</strong> to <strong>{emailConfirmation.invoice.customerId?.name}</strong>?</p>
                  <p className="confirmation-note">Once sent, the Edit button will be disabled.</p>
                </div>
               
                <div className="confirmation-actions">
                  <button
                    className="cancel-btn"
                    onClick={handleCancelSendEmail}
                    disabled={sendingEmail}
                  >
                    Cancel
                  </button>
                  <button
                    className="confirm-btn"
                    onClick={handleConfirmSendEmail}
                    disabled={sendingEmail}
                  >
                    {sendingEmail ? "Sending..." : "Okay"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && editingInvoice && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content responsive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Invoice - {editingInvoice.invoiceNumber}</h2>
              <button className="close-modal-btn" onClick={closeEditModal}>
                ×
              </button>
            </div>
           
            <div className="modal-body">
              <div className="report-card invoice-generation-card">
                <div className="card-header">
                  <h3>Edit Invoice Details</h3>
                  <p>Update invoice information</p>
                </div>
               
                <div className="form-section">
                  {/* ENHANCED: Customer selection with payment terms */}
                  <div className="form-field">
                    <label className="required">Select Customer</label>
                    <select
                      className="form-select"
                      value={selectedCustomer}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      required
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name} {customer.company ? `- ${customer.company}` : ""}
                          {customer.paymentTerms ? ` (${customer.paymentTerms} days)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                 
                  <div className="form-grid-2 responsive-form-grid">
                    {/* ENHANCED: Invoice date with auto-calculation */}
                    <div className="form-field">
                      <label>Invoice Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={invoiceDate}
                        onChange={(e) => handleInvoiceDateChange(e.target.value)}
                      />
                    </div>
                   
                    {/* ENHANCED: Due date field with auto-calculation and validation */}
                    <div className="form-field">
                      <label>Due Date {getCurrentCustomerPaymentTerms() && `(Auto-calculated: ${getCurrentCustomerPaymentTerms()} days)`}</label>
                      <input
                        type="date"
                        className="form-input"
                        value={dueDate}
                        onChange={(e) => handleDueDateChange(e.target.value)}
                        placeholder="Auto-calculated from payment terms"
                      />
                      {selectedCustomer && getCurrentCustomerPaymentTerms() && (
                        <div className="due-date-info">
                          <small>
                            Based on {getCurrentCustomerPaymentTerms()} days payment terms
                            {dueDate && ` • Calculated: ${calculateDueDate(invoiceDate, getCurrentCustomerPaymentTerms())}`}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Currency</label>
                    <select
                      className="form-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      {currencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Tax (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      placeholder="e.g. 10"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                 
                  {/* Items Section with new fields */}
                  <div className="invoice-items-section">
                    <div className="section-header">
                      <label className="required">Invoice Items</label>
                      <button onClick={handleAddItem} className="add-item-btn">
                        + Add Item
                      </button>
                    </div>
                   
                    {showItemsTable && (
                      <div className="invoice-items-table responsive-table-container">
                        <table className="responsive-table">
                          <thead>
                            <tr>
                              <th className="column-description">Description</th>
                              <th className="column-remarks">Remarks</th>
                              <th className="column-unit-price">Unit Price ({currencySymbols[currency]})</th>
                              <th className="column-quantity">Quantity</th>
                              <th className="column-amount">Amount ({currencySymbols[currency]})</th>
                              <th className="column-action">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index}>
                                <td data-label="Description">
                                  <input
                                    type="text"
                                    placeholder="Item description"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                    className="table-input"
                                    required
                                  />
                                </td>
                                <td data-label="Remarks">
                                  <input
                                    type="text"
                                    placeholder="Additional remarks"
                                    value={item.remarks}
                                    onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                                    className="table-input remarks-input"
                                  />
                                </td>
                                <td data-label={`Unit Price (${currencySymbols[currency]})`}>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                    className="table-input"
                                    min="0"
                                    step="0.01"
                                    required
                                  />
                                </td>
                                <td data-label="Quantity">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                    className="table-input"
                                    min="0"
                                    step="1"
                                    required
                                  />
                                </td>
                                <td data-label={`Amount (${currencySymbols[currency]})`}>
                                  <input
                                    type="text"
                                    value={item.amount || '0.00'}
                                    className="table-input amount-input"
                                    readOnly
                                  />
                                </td>
                                <td data-label="Action">
                                  {items.length > 1 && (
                                    <button
                                      className="remove-btn"
                                      onClick={() => handleRemoveItem(index)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Totals Summary */}
                  {showItemsTable && (
                    <div className="totals-summary">
                      <div className="summary-line">
                        <span>Subtotal:</span>
                        <span>{currencySymbols[currency]}{totals.formattedSubtotal}</span>
                      </div>
                      {taxPercent > 0 && (
                        <div className="summary-line">
                          <span>Tax ({taxPercent}%):</span>
                          <span>{currencySymbols[currency]}{totals.formattedTaxAmount}</span>
                        </div>
                      )}
                      <div className="summary-total">
                        <span>Grand Total:</span>
                        <span>{currencySymbols[currency]}{totals.formattedTotal}</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="form-field">
                    <label>Additional Notes</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Any additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="3"
                    />
                  </div>
                 
                  <button
                    className="generate-invoice-btn"
                    onClick={handleUpdateInvoice}
                    disabled={loading}
                  >
                    {loading ? "Updating..." : "Update Invoice"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Verification Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="modal-overlay" onClick={closePaymentModal}>
          <div className="modal-content payment-modal responsive-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="report-card payment-details-card">
                <div className="card-header">
                  <h3>Payment Details</h3>
                </div>
               
                <div className="form-section">
                  <div className="invoice-summary">
                    <div className="summary-row">
                      <span>Customer:</span>
                      <span>{selectedInvoice.customerId?.name || 'N/A'}</span>
                    </div>
                    <div className="summary-row">
                      <span>Amount Due:</span>
                      <span className="amount-due">
                        {currencySymbols[selectedInvoice.currency] || '$'}{formatInvoiceAmount(selectedInvoice)}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Due Date:</span>
                      <span>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                 
                  <div className="form-field">
                    <label>Transaction Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                      placeholder="Enter transaction/reference number"
                      required
                    />
                  </div>
                 
                  <div className="form-field">
                    <label>Proof of Transaction *</label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        id="transaction-proof"
                        className="file-input"
                        onChange={handleFileUpload}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        required
                      />
                      <label htmlFor="transaction-proof" className="file-upload-label">
                        {transactionProof ? transactionProof.name : 'Choose file...'}
                      </label>
                      {transactionProof && (
                        <span className="file-size">
                          {(transactionProof.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      )}
                    </div>
                    <p className="file-hint">Supported formats: PDF, JPG, PNG, DOC (Max: 10MB)</p>
                  </div>
                 
                  <div className="payment-actions">
                    <button className="cancel-btn" onClick={closePaymentModal}>
                      Cancel
                    </button>
                    <button
                      className="confirm-payment-btn"
                      onClick={handleVerifyPayment}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Confirm Payment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsBilling;