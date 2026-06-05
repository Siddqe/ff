import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const admin = new User({
      personId: 'ADMIN001',
      email: 'info@zynith-it.com',
      password: 'admin123', // Change this in production
      role: 'admin'
    });

    await admin.save();
    console.log('Admin user created successfully');
    console.log('Email: info@zynith-it.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin();