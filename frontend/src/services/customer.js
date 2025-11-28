import api from './api';

export const customerService = {
    async getCustomers() {
    const response = await api.get('/Customer/customers');
    return response.data;
  },

  async getCustomerById(customerId) {
    const response = await api.get(`/Customer/customers/${customerId}`);
    return response.data;
  },

  async createCustomer(customerData) {
    const response = await api.post('/Customer/add-customer', customerData);
    return response.data;
  },

  async updateCustomer(customerId, customerData) {
    const response = await api.put(`/Customer/customers/${customerId}`, customerData);
    return response.data;
  },

  async deleteCustomer(customerId) {
    const response = await api.delete(`/Customer/customers/${customerId}`);
    return response.data;
  },

  async updateCustomerStatus(customerId, status) {
    const response = await api.patch(`/Customer/customers/${customerId}`, { status });
    return response.data;
  },

  async getCountries() {
    const response = await fetch('https://api.countrystatecity.in/v1/countries', {
      headers: { 'X-CSCAPI-KEY': 'TU5EZnkyT05kZmJzT0lXTlN1cXJlYlg1Um1KQWlaOGFPUGdWc2NIdQ==' }
    });
    return response.json();
  },
    // Get states by country
  async getStates(countryCode) {
    const response = await fetch(`https://api.countrystatecity.in/v1/countries/${countryCode}/states`, {
      headers: { 'X-CSCAPI-KEY': 'TU5EZnkyT05kZmJzT0lXTlN1cXJlYlg1Um1KQWlaOGFPUGdWc2NIdQ==' }
    });
    return response.json();
  },

};