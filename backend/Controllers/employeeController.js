import Employee from "../models/Employee.js";
import User from '../models/User.js';
import { sendEmployeeCredentials } from '../services/emailService.js';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import bcrypt from "bcryptjs";
import SalaryTemplate from '../models/SalaryTemplate.js';
 
// Register employee
export const registerEmployee = async (req, res) => {
  try {
    const {
      personId,
      email,
      password,
      name,
      designation,
      department,
      phone,
      countryCode,
      address,
      panNumber, // Added PAN number
      joiningDate,
      status
    } = req.body;
 
    // Validation
    if (!personId || !email || !password || !name || !designation || !department || !phone || !address || !panNumber || !joiningDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }
     // Validate address object
    if (!address.addressLine1 || !address.country || !address.state || !address.city || !address.pinCode) {
      return res.status(400).json({ message: 'All address fields are required' });
    }
  // Validate PIN code format
    // const pinRegex = /^[1-9][0-9]{5}$/;
    // if (!pinRegex.test(address.pinCode)) {
    //   return res.status(400).json({ message: 'Please enter a valid 6-digit PIN code' });
    // }

    const phoneNumber = parsePhoneNumberFromString(`${countryCode}${phone}`);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return res.status(400).json({ message: 'Invalid phone number format for the selected country' });
    }
 
    // ✅ Standardize phone format
    const formattedPhone = phoneNumber.number; // e.g. +919876543210
 
    // Validate PAN number format with better error message
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const upperPan = panNumber.toUpperCase();
    
    if (!panRegex.test(upperPan)) {
      return res.status(400).json({ 
        message: 'Please enter a valid PAN number (e.g., ABCDE1234F). Format: 5 uppercase letters + 4 digits + 1 uppercase letter' 
      });
    }
 
    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,14}$/;
 
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          'Password must be 8-14 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }
 
 
    // Validate employee ID format
    if (!personId.startsWith('ZIC') || personId.length !== 6) {
      return res.status(400).json({ message: 'Invalid employee ID format. Must be ZIC followed by 3 digits (e.g., ZIC001)' });
    }
 
    // Check if the numeric part is valid
    const numericPart = personId.replace('ZIC', '');
    if (!/^\d{3}$/.test(numericPart)) {
      return res.status(400).json({ message: 'Invalid employee ID format. Must be ZIC followed by 3 digits (e.g., ZIC001)' });
    }
 
    // ✅ Check if email exists in User collection (including admin users)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists in the system' });
    }

    // ✅ Check if email exists in Employee collection
    const existingEmployeeByEmail = await Employee.findOne({ email: email.toLowerCase() });
    if (existingEmployeeByEmail) {
      return res.status(400).json({ message: 'Email already exists for another employee' });
    }

    // ✅ Check if employee ID exists
    const existingEmployeeById = await Employee.findOne({ employeeId: personId });
    if (existingEmployeeById) {
      return res.status(400).json({ message: 'Employee ID already exists' });
    }

    // ✅ Check if PAN exists
    const existingEmployeeByPan = await Employee.findOne({ panNumber: upperPan });
    if (existingEmployeeByPan) {
      return res.status(400).json({ message: 'PAN number already exists for another employee' });
    }

    // ✅ Create user
    const user = new User({
      personId,
      email: email.toLowerCase(),
      password,
      role: "employee",
      createdBy: req.user._id,
    });

   await user.save();
 
    // Create employee record
    const employee = new Employee({
      employeeId: personId,
      name,
      email,
      designation,
      department,
      phone: formattedPhone,
       address: {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        country: address.country,
        state: address.state,
        city: address.city,
        pinCode: address.pinCode
      },
      panNumber: upperPan, // Store as uppercase
      joiningDate: new Date(joiningDate),
      status: status || 'Active'
    });
    await employee.save();

    // Create automatic salary record from template
    await createEmployeeSalary(employee);

    // Send email with credentials
    sendEmployeeCredentials(
      { personId, email },
      password
    ).then(result => {
      if (result.success) {
        console.log(`Credentials email sent to ${email}`);
      } else {
        console.error(`Failed to send email to ${email}:`, result.error);
      }
    });
 
    res.status(201).json({
      message: 'Employee registered successfully. Credentials email sent.',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department,
        phone: employee.phone,
        address: employee.address,
        panNumber: employee.panNumber,
        joiningDate: employee.joiningDate,
        status: employee.status,
        createdAt: employee.createdAt
      }
    });
  } catch (error) {
    console.error('Error registering employee:', error);
   
    // Handle duplicate key errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.panNumber) {
        return res.status(400).json({
          message: 'PAN number already exists. Please use a different PAN number.'
        });
      }
      if (error.keyPattern && error.keyPattern.employeeId) {
        return res.status(400).json({
          message: 'Employee ID already exists. Please try again.'
        });
      }
      if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({
          message: 'Email already exists. Please use a different email.'
        });
      }
    }
   
    res.status(500).json({ message: 'Server error during employee registration' });
  }
};

//automatically create salary when employee is registered
const createEmployeeSalary = async (employee) => {
  try {
    // Find salary template by designation
    const salaryTemplate = await SalaryTemplate.getTemplateByDesignation(employee.designation);
    
    if (!salaryTemplate) {
      console.log(`No salary template found for designation: ${employee.designation}`);
      return null;
    }

    // Create salary record from template
    const salary = await SalaryTemplate.createSalaryFromTemplate(employee, salaryTemplate);
    console.log(`✅ Salary record created automatically for employee: ${employee.employeeId}`);
    
    return salary;
  } catch (error) {
    console.error('❌ Error creating automatic salary:', error);
    return null;
  }
};
 
// Get all employees
export const getAllEmployee = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
   
    console.log('Employees with status:');
   
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching employees' });
  }
};
 
// Get employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.id });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ employee });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching employee' });
  }
};
 
// Update employee
export const updateEmployee = async (req, res) => {
  try {
    const { panNumber, status, phone, countryCode, address,email, ...otherFields } = req.body;
    const employeeId = req.params.id; // This is the employeeId being updated

    const updateData = {
      ...otherFields,
      status: status || 'Active'
    };
   // Validate address if provided
    // if (address) {
    //   if (address.pinCode && !/^[1-9][0-9]{5}$/.test(address.pinCode)) {
    //     return res.status(400).json({ message: 'Please enter a valid 6-digit PIN code' });
    //   }
    //   updateData.address = address;
    // }
    // Validate phone only if provided
    if (typeof phone !== 'undefined') {
      const phoneNumber = parsePhoneNumberFromString(`${countryCode}${phone}`);
      if (!phoneNumber || !phoneNumber.isValid()) {
        return res.status(400).json({ message: 'Invalid phone number format for the selected country' });
      }
      updateData.phone = phoneNumber.number;
    }
 
    // ✅ Validate email if provided AND if it's different from current email
    if (typeof email !== 'undefined') {
      // Get current employee to check if email is actually being changed
      const currentEmployee = await Employee.findOne({ employeeId });
      
      if (!currentEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      const lowerEmail = email.toLowerCase();

      // Only check for duplicates if email is actually being changed
      if (currentEmployee.email !== lowerEmail) {
        // ✅ Check if email exists in User collection (including admin users)
        const existingUser = await User.findOne({ email: lowerEmail });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already exists in the system' });
        }

        // ✅ Check if email exists in another employee
        const existingEmployeeWithEmail = await Employee.findOne({
          email: lowerEmail,
          employeeId: { $ne: employeeId } // Exclude the current employee
        });

        if (existingEmployeeWithEmail) {
          return res.status(400).json({ message: 'Email already exists for another employee' });
        }
      }

      updateData.email = lowerEmail;
    }

    if (panNumber) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const upperPan = panNumber.toUpperCase();
  
  if (!panRegex.test(upperPan)) {
    return res.status(400).json({ 
      message: 'Please enter a valid PAN number (e.g., ABCDE1234F). Format: 5 letters + 4 digits + 1 letter' 
    });
  }
 
  // Get current employee to check if PAN is actually being changed
      const currentEmployee = await Employee.findOne({ employeeId });
      
      if (!currentEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Only check for duplicates if PAN is actually being changed
      if (currentEmployee.panNumber !== upperPan) {
      // Check for existing PAN in another employee
     const existingEmployeeWithPan = await Employee.findOne({
    panNumber: upperPan,
    employeeId: { $ne: employeeId } // Exclude the current employee
  });
 
       if (existingEmployeeWithPan) {
    return res.status(400).json({ 
      message: 'PAN number already exists for another employee' 
    });
  }
}

  updateData.panNumber = upperPan;
}
 
    const employee = await Employee.findOneAndUpdate(
      { employeeId: employeeId },
      {$set: updateData},
      { new: true, runValidators: true }
    );
 
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
 
    res.json({
      message: 'Employee updated successfully',
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        designation: employee.designation,
        department: employee.department,
        phone: employee.phone,
        address: employee.address,
        panNumber: employee.panNumber,
        joiningDate: employee.joiningDate,
        status: employee.status
      }
    });
  } catch (error) {
    console.error('Error updating employee:', error);
 
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.panNumber) {
        return res.status(400).json({
          message: 'PAN number already exists. Please use a different PAN number.'
        });
      }
       if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({
          message: 'Email already exists. Please use a different email.'
        });
      }
    }
 
    res.status(500).json({ message: 'Server error while updating employee' });
  }
};
 
 
// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ employeeId: req.params.id });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
   
    // Also delete the associated user
    await User.findOneAndDelete({ personId: req.params.id });
   
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Server error while deleting employee' });
  }
};
 
// Get employees by status
export const getEmployeesByStatus = async (req, res) => {
  try {
    const { status } = req.params;
   
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "Active" or "Inactive".' });
    }
   
    const employees = await Employee.find({ status }).sort({ createdAt: -1 });
   
    res.json({
      employees: employees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        designation: emp.designation,
        department: emp.department,
        phone: emp.phone,
        address: emp.address,
        panNumber: emp.panNumber,
        joiningDate: emp.joiningDate,
        status: emp.status
      }))
    });
  } catch (error) {
    console.error('Error fetching employees by status:', error);
    res.status(500).json({ message: 'Server error while fetching employees by status' });
  }
};
 
// Search employees
export const searchEmployees = async (req, res) => {
  try {
    const { query } = req.query;
   
    if (!query || query.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }
   
    const searchRegex = new RegExp(query, 'i');
   
    const employees = await Employee.find({
      $or: [
        { employeeId: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { department: searchRegex },
        { panNumber: searchRegex } // Include PAN number in search
      ]
    }).sort({ createdAt: -1 });
   
    res.json({
      employees: employees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        designation: emp.designation,
        department: emp.department,
        phone: emp.phone,
        address: emp.address,
        panNumber: emp.panNumber,
        joiningDate: emp.joiningDate,
        status: emp.status
      }))
    });
  } catch (error) {
    console.error('Error searching employees:', error);
    res.status(500).json({ message: 'Server error while searching employees' });
  }
};


// Get countries from external API
// Get states by country
export const getCountries = async (req, res) => {
  try {
    console.log('🌍 Fetching countries list...');

    // Use REST Countries API
    const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,cca2,cca3');
    console.log('✅ Countries API response received');
   
    const countries = response.data.map(country => ({
      id: country.cca2,
      code: country.cca2,
      name: country.name.common
    })).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Found ${countries.length} countries`);
   
    return res.json({
      success: true,
      countries
    });

  } catch (error) {
    console.error('❌ Error fetching countries:', error.message);
   
    // Return a proper error response
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch countries list',
      details: error.message
    });
  }
};

//-------------------------
// Get employee statistics
export const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
   
    // Get employees by department
    const departmentStats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get employees by designation
    const designationStats = await Employee.aggregate([
      {
        $group: {
          _id: '$designation',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        byDepartment: departmentStats,
        byDesignation: designationStats
      }
    });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee statistics'
    });
  }
};

// Bulk update employee status
export const bulkUpdateStatus = async (req, res) => {
  try {
    const { employeeIds, status } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "Active" or "Inactive".'
      });
    }

    const result = await Employee.updateMany(
      { employeeId: { $in: employeeIds } },
      { $set: { status: status } }
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} employees to ${status} status`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk update'
    });
  }
};
