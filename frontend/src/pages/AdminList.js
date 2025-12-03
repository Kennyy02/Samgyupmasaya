import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminList.css';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL;

const AdminList = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      const res = await axios.get(`${AUTH_API_URL}/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdmins(res.data);
      setLoading(false);

    } catch (err) {
      setError('Failed to load admins: ' + (err.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;

    try {
      const token = localStorage.getItem('token');

      await axios.delete(`${AUTH_API_URL}/auth/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAdmins(admins.filter((a) => a.id !== id));
      alert('Admin deleted successfully!');

    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Restrict access
  if (localStorage.getItem('role') !== 'super') {
    return (
      <div className="permission-denied">
        <h2>⚠️ Access Denied</h2>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  // Counts for stats
  const totalAdmins = admins.length;
  const superAdmins = admins.filter(a => a.role === 'super').length;
  const normalAdmins = admins.filter(a => a.role === 'normal').length;

  return (
    <div className="admin-list-page">

      {/* =========================== */}
      {/*       TOP STATS BAR        */}
      {/* =========================== */}
      <div className="stats-bar">
        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <p className="stat-label">Total Admins</p>
            <p className="stat-value">{totalAdmins}</p>
          </div>
        </div>

        <div className="stat-card super">
          <div className="stat-icon">👑</div>
          <div className="stat-content">
            <p className="stat-label">Super Admins</p>
            <p className="stat-value">{superAdmins}</p>
          </div>
        </div>

        <div className="stat-card normal">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <p className="stat-label">Normal Admins</p>
            <p className="stat-value">{normalAdmins}</p>
          </div>
        </div>
      </div>

      {/* =========================== */}
      {/*        ADMIN TABLE          */}
      {/* =========================== */}
      <h2>Manage Admins</h2>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {admins.map(admin => (
              <tr key={admin.id}>
                <td>#{admin.id}</td>
                <td>{admin.username}</td>
                <td>
                  <span className={`role-badge ${admin.role}`}>
                    {admin.role === 'super' ? 'Super Admin' : 'Admin'}
                  </span>
                </td>
                <td>{admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '—'}</td>

                <td>
                  <button
                    className="delete-btn small"
                    onClick={() => handleDelete(admin.id)}
                    disabled={
                      admin.role === 'super' &&
                      admins.filter(a => a.role === 'super').length === 1
                    }
                  >
                    Remove
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminList;
