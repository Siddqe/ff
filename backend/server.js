import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import employeeRoutes from './routes/employees.js'; // Add this line
import salaryRoutes from './routes/salaryRoutes.js';
import CustomerRoutes from './routes/CustomerRoutes.js';
import employeeDashboardRoutes from './routes/EmployeeDashboard.js';
import transactionRoutes from './routes/transaction.js'; 
import Invoice from './routes/invoice.js';
import companyRoutes from './routes/companyRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js'
//import Phot from "./routes/upload.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { startHikeCronJob  } from './services/cronService.js';
import Salary from './models/Salary.js'; // Import Salary model for manual trigger
import salaryTemplateRoutes from './routes/salaryTemplateRoutes.js';

dotenv.config();

const app = express();


// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// Serve static files from uploads directory
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes); 
app.use('/api/salaries', salaryRoutes);
app.use('/api/salary-templates', salaryTemplateRoutes);
app.use('/api/customer',CustomerRoutes);
app.use('/api/employee', employeeDashboardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/billing', Invoice);
app.use('/api/company', companyRoutes);
app.use('/api/categories', categoryRoutes);



// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is running!' });
});

// Manual trigger endpoint for testing hike updates
app.post('/api/test-hike-updates', async (req, res) => {
  try {
    console.log('🔄 Manual trigger: Checking for salary hike status updates...');
    
    /** @type {{activated: number, disabled: number}} */
    const result = await Salary.processHikeStatusUpdates();
    
    res.json({
      message: 'Hike status updates processed manually',
      result: result
    });
  } catch (error) {
    console.error('❌ Error in manual trigger:', error);
    res.status(500).json({ 
      message: 'Error processing hike updates',
      error: error.message 
    });
  }
});

// Get hike status info endpoint
app.get('/api/hike-status-info', async (req, res) => {
  try {
    const pendingHikes = await Salary.find({
      activeStatus: 'disabled',
      'hike.applied': true,
      'hike.startDate': { $gt: new Date() }
    }).select('employeeId name hike.startDate monthlyCtc');

    const activatableHikes = await Salary.find({
      activeStatus: 'disabled',
      'hike.applied': true,
      'hike.startDate': { $lte: new Date() }
    }).select('employeeId name hike.startDate monthlyCtc');

    res.json({
      pendingHikes: pendingHikes,
      activatableHikes: activatableHikes,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching hike status info:', error);
    res.status(500).json({ 
      message: 'Error fetching hike status info',
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() =>{ console.log('✅ Connected to MongoDB');
  // Start the cron job after successful database connection
    startHikeCronJob();
    //startMonthlyUpdateCronJob (); 
    })
  .catch((error) => console.error('❌ MongoDB connection error:', error));

const PORT = process.env.PORT || 5000;
const MongoDB = process.env.MONGODB_URI ; 
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`${MongoDB}`);
});

export default app;