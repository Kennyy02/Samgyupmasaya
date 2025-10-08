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
import './AdminLayout.css'; // This import is correct

const AdminLayout = () => {
  const location = useLocation();
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role'); 
    window.location.href = '/login';
  };

  return (
    <div className="admin-layout">
      <div className="sidebar">
        <h2>Admin Panel</h2>
        <nav>
          <ul>
            <li> {/* Link 1: Dashboard Home */}
              <Link
                to="/dashboard"
                // The 'active' class is applied directly to the Link component (which renders an <a> tag)
                className={location.pathname === '/dashboard' ? 'active' : ''} 
              >
                <FaHome className="sidebar-icon" /> Dashboard Home
              </Link>
            </li>
            <li> {/* Link 2: Manage Products */}
              <Link
                to="/products"
                className={location.pathname === '/products' ? 'active' : ''}
              >
                <FaBoxOpen className="sidebar-icon" /> Manage Products
              </Link>
            </li>
            <li> {/* Link 3: View Orders */}
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
                <li> {/* Link 4: Add Admin */}
                  <Link
                    to="/admin-register"
                    className={location.pathname === '/admin-register' ? 'active' : ''}
                  >
                    <FaUserShield className="sidebar-icon" /> Add Admin
                  </Link>
                </li>
                <li> {/* Link 5: Manage Admins */}
                  <Link
                    to="/admin-list"
                    className={location.pathname === '/admin-list' ? 'active' : ''}
                  >
                    <FaUsers className="sidebar-icon" /> Manage Admins
                  </Link>
                </li>
                <li> {/* Link 6: Registered Customers */}
                  <Link
                    to="/customer-list"
                    className={location.pathname === '/customer-list' ? 'active' : ''}
                  >
                    <FaUsers className="sidebar-icon" /> Registered Customers
                  </Link>
                </li>
              </>
            )}

            <li> {/* Link 7: Logout Button */}
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt className="sidebar-icon" /> Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>

      <div className="main-content">
        {/* The child route components (like Dashboard) will be rendered here */}
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
