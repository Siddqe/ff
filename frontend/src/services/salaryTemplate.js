import api from './api';

export const salaryTemplateService = {
  // Get all salary templates
  getSalaryTemplates: async () => {
    const response = await api.get('/salary-templates');
    return response.data;
  },

  // Get salary template by ID
  getSalaryTemplateById: async (id) => {
    const response = await api.get(`/salary-templates/${id}`);
    return response.data;
  },

  // Get salary template by designation
  getSalaryTemplateByDesignation: async (designation) => {
    const response = await api.get(`/salary-templates/designation/${encodeURIComponent(designation)}`);
    return response.data;
  },

  // Create salary template
  createSalaryTemplate: async (templateData) => {
    const response = await api.post('/salary-templates', templateData);
    return response.data;
  },

  // Update salary template
  updateSalaryTemplate: async (id, templateData) => {
    const response = await api.put(`/salary-templates/${id}`, templateData);
    return response.data;
  },

  // Delete salary template
  deleteSalaryTemplate: async (id) => {
    const response = await api.delete(`/salary-templates/${id}`);
    return response.data;
  },

  // Update template status
  updateTemplateStatus: async (id, status) => {
    const response = await api.patch(`/salary-templates/${id}/status`, { status });
    return response.data;
  },

  // Get designations from categories
  getEmployeeDesignations: async () => {
    const response = await api.get('/categories/employee-designation');
    return response.data;
  },

  // Or get all categories at once
  getAllEmployeeCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  }
};

export default salaryTemplateService;