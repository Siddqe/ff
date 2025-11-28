import api from './api';

export const employeeService = {

    async registerEmployee(employeeData) {
    const response = await api.post('/employees/register/employee', employeeData);
    return response.data;
  },
    // Get all employees (admin only)
  async getEmployees() {
    const response = await api.get('/employees');
    return response.data;
  },

  // Get employee by ID
  async getEmployeeById(employeeId) {
    const response = await api.get(`/employees/${employeeId}`);
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

  // Update employee
  async updateEmployee(employeeId, employeeData) {
    const response = await api.put(`/employees/${employeeId}`, employeeData);
    return response.data;
  },

  // Delete employee
  async deleteEmployee(employeeId) {
    
    const response = await api.delete(`/employees/${employeeId}`);
    return response.data;
  },

  //upload photo for the employee dashboard
  uploadPhoto: (formData) => api.post('/upload/photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

    // Get categories for employee dropdowns
  getEmployeeDesignations: async () => {
    const response = await api.get('/categories/employee-designation');
    return response.data;
  },

  getEmployeeDepartments: async () => {
    // Since you have 'employee-role' type, we'll use that for departments
    // Or you might want to create a new type 'employee-department'
    const response = await api.get('/categories/employee-role');
    return response.data;
  },

  // Or get all categories at once
  getAllEmployeeCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  
  removePhoto: () => api.delete('/upload/photo'),
};