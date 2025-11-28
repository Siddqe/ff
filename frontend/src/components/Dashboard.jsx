import React from 'react';
import { useAuth } from '../context/AuthContext';
import Admin from './AdminDashboard/Admin';
import EmployeeDashboard from './EmployeeDashboard/employeeDashboard';


const Dashboard = () => {
  const { user } = useAuth();

  // Route based on user role
  if (user?.role === 'admin') {
    return <Admin />;
  } else {
    return <EmployeeDashboard />;
  }
};

export default Dashboard;