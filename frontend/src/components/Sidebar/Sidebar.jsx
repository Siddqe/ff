import React, { useState } from 'react';
import './Sidebar.css';
 
// Custom SVG Icons
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
  </svg>
);
 
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A3.02 3.02 0 0 0 16.95 6h-2.2c-.79 0-1.52.47-1.85 1.2l-.78 1.83-2.7-1.05-.75 1.9L9 11l-3.5-1.5-.78 1.92L8 14.5V22h2v-6h2v6h2zm-6 0v-4h-2v4H6v-6.5l3.5-1.5 3.5 1.5V22h-2z"/>
  </svg>
);
 
const CustomerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
);
 
const DollarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.78-1.18 2.73-3.12 3.16z"/>
  </svg>
);
 
const TemplateIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);
 
const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
  </svg>
);
 
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>
  </svg>
);
 
const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);
 
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.84L12 13.42l4.59-4.58L18 10.25l-6 6-6-6z"/>
  </svg>
);
 
const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
  </svg>
);
 
const CategoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l-5.5 9h11z"/>
    <circle cx="17.5" cy="17.5" r="4.5"/>
    <path d="M3 13.5h8v8H3z"/>
  </svg>
);
 
const CompanyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
  </svg>
);
 
const Sidebar = ({ activeSection, setActiveSection, onLogout }) => {
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
 
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'employees', label: 'Employee Management', icon: <UsersIcon /> },
    { id: 'customers', label: 'Customer Management', icon: <CustomerIcon /> },
    {
      id: 'salary',
      label: 'Salary Management',
      icon: <DollarIcon />,
      submenu: [
        { id: 'salary-records', label: 'Salary Records', icon: <DollarIcon /> },
        { id: 'salary-templates', label: 'Salary Templates', icon: <TemplateIcon /> }
      ]
    },
    { id: 'transactions', label: 'In/Out Transactions', icon: <RefreshIcon /> },
    { id: 'reports', label: 'Reports & Billing', icon: <ChartIcon /> },
  ];
 
  const settingsItems = [
    { id: 'category-settings', label: 'Category Settings', icon: <CategoryIcon /> },
    { id: 'company-settings', label: 'Company Settings', icon: <CompanyIcon /> }
  ];
 
  const handleSalaryClick = () => {
    setSalaryOpen(!salaryOpen);
    // If salary is not open and no salary submenu is active, set the first salary item as active
    if (!salaryOpen && !menuItems.find(item => item.id === 'salary')?.submenu?.some(subItem => subItem.id === activeSection)) {
      setActiveSection('salary-records');
    }
  };
 
  const handleSettingsClick = () => {
    setSettingsOpen(!settingsOpen);
    // If settings is not open, set the first settings item as active
    if (!settingsOpen && !settingsItems.some(item => item.id === activeSection)) {
      setActiveSection('category-settings');
    }
  };
 
  const handleSubmenuClick = (itemId) => {
    setActiveSection(itemId);
  };
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
  </svg>
);
  const isSalaryActive = menuItems.find(item => item.id === 'salary')?.submenu?.some(subItem => subItem.id === activeSection);
  const isSettingsActive = settingsItems.some(item => item.id === activeSection);
 
  return (
    <div className="sidebar">
      <div className="company-brand">
        <h2>Zynith IT Solutions</h2>
      </div>
     
      <nav className="sidebar-nav">
        {menuItems.map(item => {
          if (item.submenu) {
            return (
              <div key={item.id} className={`dropdown-container ${salaryOpen ? 'open' : ''}`}>
                <button
                  className={`nav-item dropdown-toggle ${isSalaryActive ? 'active' : ''}`}
                  onClick={handleSalaryClick}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                  <span className="dropdown-arrow">
                    {salaryOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </span>
                </button>
               
                <div className={`dropdown-menu ${salaryOpen ? 'open' : ''}`}>
                  {item.submenu.map(subItem => (
                    <button
                      key={subItem.id}
                      className={`dropdown-item ${activeSection === subItem.id ? 'active' : ''}`}
                      onClick={() => handleSubmenuClick(subItem.id)}
                    >
                      <span className="dropdown-icon">{subItem.icon}</span>
                      <span className="dropdown-label">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          }
         
          return (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
 
        {/* Settings with Dropdown */}
        <div className={`dropdown-container ${settingsOpen ? 'open' : ''}`}>
          <button
            className={`nav-item dropdown-toggle ${isSettingsActive ? 'active' : ''}`}
            onClick={handleSettingsClick}
          >
            <span className="nav-icon"><SettingsIcon /></span>
            <span className="nav-label">Settings</span>
            <span className="dropdown-arrow">
              {settingsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </span>
          </button>
         
          <div className={`dropdown-menu ${settingsOpen ? 'open' : ''}`}>
            {settingsItems.map(item => (
              <button
                key={item.id}
                className={`dropdown-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => handleSubmenuClick(item.id)}
              >
                <span className="dropdown-icon">{item.icon}</span>
                <span className="dropdown-label">{item.label}</span>
              </button>
             
            ))}
          </div>
        </div>
 
        {/* Logout Button - Added at the bottom */}
        <button
          className="nav-item"
          onClick={onLogout}
        >
          <span className="nav-icon"><LogoutIcon /></span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </div>
   
  );
 
};
 
export default Sidebar;