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

  // Loading state
  if (loading) {
    return (
      <div className="admin-list-page">
        <div className="loading-state">Loading admins...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="admin-list-page">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const totalAdmins = admins.length;

  return (
    <div className="admin-list-page">

      {/* =========================== */}
      {/*       PAGE HEADER          */}
      {/* =========================== */}
      <div className="page-header">
        <h2>Manage Admins</h2>
        <div className="total-count">
          <p className="count-label">Total Admins:</p>
          <p className="count-value">{totalAdmins}</p>
        </div>
      </div>

      {/* =========================== */}
      {/*        ADMIN TABLE          */}
      {/* =========================== */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>USERNAME</th>
              <th>ROLE</th>
              <th>CREATED</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>
            {admins.length === 0 ? (
              <tr className="empty-state">
                <td colSpan="5">No admins found</td>
              </tr>
            ) : (
              admins.map(admin => (
                <tr key={admin.id}>
                  <td>#{admin.id}</td>
                  <td>{admin.username}</td>
                  <td>
                    <span className={`role-badge ${admin.role}`}>
                      {admin.role === 'super' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td>
                    {admin.created_at 
                      ? new Date(admin.created_at).toLocaleDateString() 
                      : '—'}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
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
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminList;
