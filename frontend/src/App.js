// src/App.js
import React from 'react';
// 1. Import BrowserRouter directly
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login'; 
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import AdminLayout from './components/AdminLayout';

// Customer Pages
import CustomerHome from './pages/CustomerHome'; 
import CustomerAuth from './pages/CustomerAuth'; 
import OnlineMenu from './pages/OnlineMenu'; 
import ScanQRCode from './pages/ScanQRCode'; 
import OnsiteMenu from './pages/OnsiteMenu'; 

// Info Pages
import AboutUs from './pages/AboutUs';
import Rules from './pages/Rules';
import CustomerTerms from './pages/CustomerTerms';

// Admin Pages
import AdminRegister from './pages/AdminRegister';
import AdminList from './pages/AdminList';
import CustomerList from './pages/CustomerList';  

const App = () => {
  const isAdminAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  // 2. Define the basename using the PUBLIC_URL environment variable
  const basename = process.env.PUBLIC_URL;

  return (
    {/* 3. Use BrowserRouter with the basename prop */}
    <BrowserRouter basename={basename}> 
      <div className="App">
        <Routes>
          {/* Customer Main Page (Home) */}
          <Route path="/" element={<CustomerHome />} />

          {/* Customer Authentication */}
          <Route path="/customer/auth" element={<CustomerAuth />} />

          {/* Online & Onsite */}
          <Route path="/online-menu" element={<OnlineMenu />} />
          <Route path="/scan-qr" element={<ScanQRCode />} />
          <Route path="/onsite-menu" element={<OnsiteMenu />} />

          {/* Customer Info Pages */}
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/customer-terms" element={<CustomerTerms />} />

          {/* Admin Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Admin Routes */}
          <Route
            path="/"
            element={isAdminAuthenticated() ? <AdminLayout /> : <Navigate to="/login" />}
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="orders" element={<Orders />} />
            <Route path="admin-register" element={<AdminRegister />} />
            <Route path="admin-list" element={<AdminList />} />
            <Route path="customer-list" element={<CustomerList />} /> 
          </Route>

          {/* Fallback for unauthenticated admin access */}
          {!isAdminAuthenticated() && (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
