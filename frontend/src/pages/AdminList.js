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

      console.log('✅ Admins data received:', res.data);
      console.log('✅ Number of admins:', res.data.length);
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
  const superAdminCount = admins.filter(a => a.role === 'super').length;

  return (
    <div className="admin-list-page">

      {/* PAGE HEADER */}
      <div className="page-header">
        <h2>Manage Admins</h2>
        <div className="total-count">
          <p className="count-label">Total Admins:</p>
          <p className="count-value">{totalAdmins}</p>
        </div>
      </div>

      {/* ADMIN TABLE */}
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
              admins.map(admin => {
                const isLastSuperAdmin = admin.role === 'super' && superAdminCount === 1;
                
                return (
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
                        ? new Date(admin.created_at).toLocaleDateString('en-US', { 
                            month: 'numeric', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem' }}>
                      {isLastSuperAdmin ? (
                        <button
                          type="button"
                          disabled
                          style={{
                            background: '#e9ecef',
                            color: '#6c757d',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'not-allowed',
                            minWidth: '90px',
                            opacity: 0.6
                          }}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(admin.id)}
                          style={{
                            background: 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(255, 193, 7, 0.3)',
                            minWidth: '90px',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 10px rgba(255, 193, 7, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 6px rgba(255, 193, 7, 0.3)';
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default AdminList;
