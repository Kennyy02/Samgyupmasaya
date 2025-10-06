// src/components/AdminLayout.js
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaBoxOpen,
  FaShoppingCart,
  FaSignOutAlt,
  FaUserShield,
  FaUsers
} from 'react-icons/fa';
import './AdminLayout.css';

const AdminLayout = () => {
  const location = useLocation();
  const role = localStorage.getItem('role'); // 👈 Get role from login

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); // 👈 clear role too
    window.location.href = '/login';
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <ul>
            <li>
              <Link
                to="/dashboard"
                className={location.pathname === '/dashboard' ? 'active' : ''}
              >
                <FaHome className="sidebar-icon" /> Dashboard Home
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className={location.pathname === '/products' ? 'active' : ''}
              >
                <FaBoxOpen className="sidebar-icon" /> Manage Products
              </Link>
            </li>
            <li>
              <Link
                to="/orders"
                className={location.pathname === '/orders' ? 'active' : ''}
              >
                <FaShoppingCart className="sidebar-icon" /> View Orders
              </Link>
            </li>

            {/* 👇 Only show for Super Admin */}
            {role === 'super' && (
              <>
                <li>
                  <Link
                    to="/admin-register"
                    className={location.pathname === '/admin-register' ? 'active' : ''}
                  >
                    <FaUserShield className="sidebar-icon" /> Add Admin
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin-list"
                    className={location.pathname === '/admin-list' ? 'active' : ''}
                  >
                    <FaUsers className="sidebar-icon" /> Manage Admins
                  </Link>
                </li>
                {/* ✅ New Customer List link */}
                <li>
                  <Link
                    to="/customer-list"
                    className={`customer-link ${location.pathname === '/customer-list' ? 'active' : ''}`}
                  >
                    <FaUsers className="sidebar-icon" /> Registered Customers
                  </Link>
                </li>
              </>
            )}

            <li>
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt className="sidebar-icon" /> Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
