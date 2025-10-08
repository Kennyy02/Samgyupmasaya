import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminList.css';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL;

const AdminList = () => {
  const [admins, setAdmins] = useState([]);

  const fetchAdmins = async () => { /* ... fetchAdmins logic ... */ };
  const handleDelete = async (id) => { /* ... handleDelete logic ... */ };

  useEffect(() => {
    fetchAdmins();
  }, []);

  if (localStorage.getItem('role') !== 'super') {
    return <p>You do not have permission to access this page.</p>;
  }

  return (
    // FIX 1: Change outer container class to admin-content-box 
    //        to separate it from the old fixed-width styling.
    <div className="admin-content-box"> 
      <h2>Manage Admins</h2>
      
      {/* FIX 2: Introduce a new container to properly enclose the table */}
      <div className="admin-table-container"> 
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
    </div>
  );
};

export default AdminList;
