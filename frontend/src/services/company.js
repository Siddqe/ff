import api from './api';
 
const COMPANY_API_URL = '/company';
 
export const companyService = {
  // Get company information
  async getCompanyInfo() {
    const response = await api.get(COMPANY_API_URL);
    return response.data;
  },
 
  // Update company information
  async updateCompanyInfo(companyData) {
    const response = await api.put(COMPANY_API_URL, companyData);
    return response.data;
  },
 
  // Validate company data (optional, can be used in both frontend and backend)
  validateCompanyData(companyInfo) {
    const errors = {};
   
    if (!companyInfo.address?.trim()) {
      errors.address = 'Company address is required';
    }
   
    if (companyInfo.email && !/\S+@\S+\.\S+/.test(companyInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
   
    return errors;
  },
    async uploadImage (file, type) {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type); // 'logo' or 'signature'
     
      const response = await api.post('/company/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
     
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  },
 
    deleteImage: async (type) => {
    try {
      const response = await api.delete(`/company/delete-image/${type}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete image');
    }
  }
};
 
// Export default company info structure
export const defaultCompanyInfo = {
  companyName: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  taxId: '',
  currency: 'USD',
  fiscalYear: 'January'
};
 
// Export constants for dropdowns
export const currencyOptions = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'INR', label: 'INR (₹)' }
];
 
export const fiscalYearOptions = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
 