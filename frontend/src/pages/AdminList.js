import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminList.css';

// ✅ Define the base URL using the environment variable
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL;

// ❌ Critical Safety Check: The code assumes 'auth-service' (5001) is the admin service.
// The variable used is REACT_APP_AUTH_API_URL.

const AdminList = () => {
  const [admins, setAdmins] = useState([]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      // ✅ Change 1: Use the environment variable for the base URL
      const res = await axios.get(`${AUTH_API_URL}/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(res.data);
    } catch (err) {
      alert('Failed to load admins: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      const token = localStorage.getItem('token');
      // ✅ Change 2: Use the environment variable for the base URL
      await axios.delete(`${AUTH_API_URL}/auth/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdmins(admins.filter((a) => a.id !== id));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  if (localStorage.getItem('role') !== 'super') {
    return <p>You do not have permission to access this page.</p>;
  }

  return (
    <div className="admin-list-page">
      <h2>Manage Admins</h2>
      <table>
        <thead>
          <tr>
            <th>Admin ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td data-label="Admin ID">{admin.id}</td>
              <td data-label="Username">{admin.username}</td>
              <td data-label="Role">{admin.role}</td>
              <td data-label="Actions">
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(admin.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminList;
