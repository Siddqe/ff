import api from './api';

const API_BASE_URL = '/transactions';

export const transactionService = {
  // Get all transactions with filters
  async getTransactions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`${API_BASE_URL}?${params.toString()}`);
    return response.data;
  },

  // Add new transaction
  async addTransaction(transactionData) {
    const formData = new FormData();
    formData.append('description', transactionData.description);
    formData.append('amount', transactionData.amount);
    formData.append('type', transactionData.type);
    formData.append('category', transactionData.category);
    formData.append('remarks', transactionData.remarks);
    formData.append('date', transactionData.date);
    
    if (transactionData.attachment) {
      formData.append('attachment', transactionData.attachment);
    }

    const response = await api.post(API_BASE_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update transaction
  async updateTransaction(transactionId, transactionData) {
    const formData = new FormData();
    formData.append('description', transactionData.description);
    formData.append('amount', transactionData.amount);
    formData.append('type', transactionData.type);
    formData.append('category', transactionData.category);
    formData.append('remarks', transactionData.remarks);
    formData.append('date', transactionData.date);
    
    if (transactionData.attachment) {
      formData.append('attachment', transactionData.attachment);
    }

    const response = await api.put(`${API_BASE_URL}/${transactionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete transaction
  async deleteTransaction(transactionId) {
    const response = await api.delete(`${API_BASE_URL}/${transactionId}`);
    return response.data;
  },

  // Download attachment
  async downloadAttachment(transactionId) {
    const response = await api.get(`${API_BASE_URL}/${transactionId}/attachment`, {
      responseType: 'blob'
    });
    return response;
  },

  // Get transaction by ID
  async getTransactionById(transactionId) {
    const response = await api.get(`${API_BASE_URL}/${transactionId}`);
    return response.data;
  },

  // Get transaction statistics - Fixed method name
  async getTransactionStats() {
    const response = await api.get(`${API_BASE_URL}/stats/summary`);
    return response.data;
  },

  // Get transactions by date range
  async getTransactionsByDateRange(startDate, endDate) {
    const response = await api.get(`${API_BASE_URL}?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Get categories summary
  async getCategoriesSummary() {
    const response = await api.get(`${API_BASE_URL}/stats/categories`);
    return response.data;
  },

  // Get monthly summary
  async getMonthlySummary(year) {
    const response = await api.get(`${API_BASE_URL}/stats/monthly?year=${year}`);
    return response.data;
  }
};

// Export constants for use in components
export const typeOptions = ['Income', 'Expense'];