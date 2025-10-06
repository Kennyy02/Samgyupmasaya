import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminList.css';

const AdminList = () => {
  const [admins, setAdmins] = useState([]);

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5001/auth/admins', {
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
      await axios.delete(`http://localhost:5001/auth/admins/${id}`, {
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
