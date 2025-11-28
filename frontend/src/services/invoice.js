import api from './api';

const BILLING_API_URL = '/billing';

export const billingService = {
  // Get all customers
  async getCustomers() {
    const response = await api.get(`/Customer/customers`);
    return response.data;
  },

  // Get all invoices
  async getInvoices() {
    const response = await api.get(`${BILLING_API_URL}/invoices`);
    return response.data;
  },

    // Generate new invoice
  async generateInvoice(invoiceData) {
    const response = await api.post(`${BILLING_API_URL}/generate-invoice`, invoiceData, {
      responseType: 'blob'
    });
    return response;
  },
  
  async getDisabledInvoices() {
    try {
      // First try to use the dedicated endpoint if it exists
      const response = await api.get(`${BILLING_API_URL}/invoices/disabled`);
      return response.data;
    } catch (error) {
      console.log('⚠️ Using fallback for disabled invoices');
      // Fallback: get all invoices and filter disabled ones
      const allInvoices = await this.getInvoices();
      return allInvoices.filter(invoice => invoice.isDisabled || invoice.deleted);
    }
  },

    async getInvoiceById(invoiceId) {
    const response = await api.get(`${BILLING_API_URL}/invoices/${invoiceId}`);
    return response.data;
  },

  // Update existing invoice
  async updateInvoice(invoiceId, invoiceData) {
    const response = await api.put(`${BILLING_API_URL}/invoices/${invoiceId}`, invoiceData);
    return response.data;
  },


  // Download invoice PDF
  async downloadInvoice(invoiceId) {
    const response = await api.get(`${BILLING_API_URL}/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  // Delete invoice
  async deleteInvoice(invoiceId) {
    const response = await api.delete(`${BILLING_API_URL}/invoices/${invoiceId}`);
    return response.data;
  },

    // Disable invoice (move to disabled)
  async disableInvoice(invoiceId) {
    const response = await api.patch(`${BILLING_API_URL}/invoices/${invoiceId}/disable`);
    return response.data;
  },

    // Restore disabled invoice
  async restoreInvoice(invoiceId) {
    const response = await api.patch(`${BILLING_API_URL}/invoices/${invoiceId}/restore`);
    return response.data;
  },

    // Permanently delete invoice
  async permanentDeleteInvoice(invoiceId) {
    const response = await api.delete(`${BILLING_API_URL}/invoices/${invoiceId}/permanent`);
    return response.data;
  },

  // Verify payment
  async verifyPayment(paymentData) {
    const formData = new FormData();
    formData.append('invoiceId', paymentData.invoiceId);
    formData.append('transactionNumber', paymentData.transactionNumber);
    formData.append('transactionProof', paymentData.transactionProof);

    const response = await api.post(`${BILLING_API_URL}/verify-payment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Download Profit & Loss Excel report
  async downloadProfitLossExcel(startDate, endDate) {
    const response = await api.get(`/transactions/export/excel?startDate=${startDate}&endDate=${endDate}`, {
      responseType: 'blob'
    });
    return response;
  },
   // Add these two new methods:
  async getInvoiceDownloadUrl(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download-url`);
      return response.data;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  },

 async downloadInvoiceBlob(invoiceId) {
  try {
    console.log('📥 Downloading invoice blob for:', invoiceId);
    const response = await api.get(`${BILLING_API_URL}/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    console.log('✅ Invoice blob downloaded successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error downloading invoice blob:', error);
    console.error('❌ Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    // Check if it's a 404 error
    if (error.response?.status === 404) {
      throw new Error('Invoice PDF not found. Please generate the invoice first.');
    }
    
    throw new Error(`Failed to download invoice: ${error.response?.statusText || error.message}`);
  }
}
};

// Export constants for use in components
export const currencySymbols = {
  USD: '$',
  EUR: '€',
  INR: '₹'
};

export const currencyOptions = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'INR', label: 'Indian Rupee (₹)' }
];

export const defaultInvoiceItem = {
  description: "",
  remarks: "",
  amount: ""
};

// Utility functions
export const formatCurrencyDisplay = (amount, currency = 'USD') => {
  if (currency === 'INR') {
    // Indian numbering system
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    // Western numbering system
    return amount.toFixed(2);
  }
};

export const checkInvoiceStatus = (invoice) => {
  const today = new Date();
  const due = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const invoiceDate = new Date(invoice.date);
 
  // Check if invoice is paid first
  if (invoice.status === 'paid') return 'paid';
  
  // Calculate 30 days from invoice date
  const thirtyDaysFromInvoice = new Date(invoiceDate);
  thirtyDaysFromInvoice.setDate(invoiceDate.getDate() + 30);
 
  // Check EITHER condition:
  // 1. If due date exists and today exceeded due date
  // 2. OR if 30 days have passed from invoice date
  if ((due && today > due) || today > thirtyDaysFromInvoice) {
    return 'overdue';
  }
 
  // For draft and sent invoices, return 'unpaid' for display
  if (invoice.status === 'draft' || invoice.status === 'sent') {
    return 'unpaid';
  }
 
  return invoice.status;
};

export const formatInvoiceAmount = (invoice) => {
  const amount = invoice.totalAmount || 0;
  return formatCurrencyDisplay(amount, invoice.currency);
};
export const extractErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.response?.status === 404) {
    return "Requested resource not found. Please check if all required data is set up.";
  }
  if (error.response?.status === 500) {
    return "Server error. Please try again later.";
  }
  return error.message || "An unexpected error occurred.";
};


export const calculateInvoiceTotals = (items, taxPercent = 0, currency = 'USD') => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxAmount = subtotal * (taxPercent / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: subtotal,
    taxAmount: taxAmount,
    total: total,
    formattedSubtotal: formatCurrencyDisplay(subtotal, currency),
    formattedTaxAmount: formatCurrencyDisplay(taxAmount, currency),
    formattedTotal: formatCurrencyDisplay(total, currency)
  };
};

// File validation
export const validateFile = (file, maxSizeMB = 10) => {
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File size too large. Maximum size is ${maxSizeMB}MB.`);
  }
 
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Supported formats: PDF, JPG, PNG, DOC');
  }

  return true;
};

// Date utilities
export const getDefaultDates = () => {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split("T")[0];
  
  return {
    today,
    firstDay
  };
};