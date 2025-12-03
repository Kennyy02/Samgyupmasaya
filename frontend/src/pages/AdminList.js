import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminList.css';

// ✅ Define the base URL using the environment variable
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
      
      // ✅ FIXED: Proper template literal syntax with parentheses
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
      
      // ✅ FIXED: Proper template literal syntax with parentheses
      await axios.delete(`${AUTH_API_URL}/auth/admins/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Remove deleted admin from state
      setAdmins(admins.filter((a) => a.id !== id));
      
      // Show success message
      alert('Admin deleted successfully!');
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Permission check
  if (localStorage.getItem('role') !== 'super') {
    return (
      <div className="admin-list-page">
        <div className="permission-denied">
          <h2>⚠️ Access Denied</h2>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="admin-list-page">
        <div className="loading-state">
          <p>Loading admins...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="admin-list-page">
        <div className="error-state">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={fetchAdmins} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-list-page">
      <div className="page-header">
        <h2>Manage Admins</h2>
        <p className="page-subtitle">
          Total Admins: <span className="count-badge">{admins.length}</span>
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="empty-state">
          <p>No admins found.</p>
        </div>
      ) : (
        <div className="admin-cards-container">
          {admins.map((admin) => (
            <div key={admin.id} className="admin-card">
              <div className="admin-card-header">
                <div className="admin-avatar">
                  {admin.username.charAt(0).toUpperCase()}
                </div>
                <div className="admin-info">
                  <h3 className="admin-username">{admin.username}</h3>
                  <span className={`role-badge ${admin.role}`}>
                    {admin.role === 'super' ? '👑 Super Admin' : '👤 Admin'}
                  </span>
                </div>
              </div>
              
              <div className="admin-card-body">
                <div className="info-row">
                  <span className="label">Admin ID</span>
                  <span className="value">#{admin.id}</span>
                </div>
                <div className="info-row">
                  <span className="label">Username</span>
                  <span className="value">{admin.username}</span>
                </div>
                <div className="info-row">
                  <span className="label">Role</span>
                  <span className="value">{admin.role}</span>
                </div>
                {admin.created_at && (
                  <div className="info-row">
                    <span className="label">Created</span>
                    <span className="value">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="admin-card-footer">
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(admin.id)}
                  disabled={admin.role === 'super' && admins.filter(a => a.role === 'super').length === 1}
                  title={admin.role === 'super' && admins.filter(a => a.role === 'super').length === 1 ? 'Cannot delete the last super admin' : 'Delete admin'}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminList;
