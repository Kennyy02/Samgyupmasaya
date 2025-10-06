import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CustomerList.css';

// ✅ Define the base URL using the environment variable for the Auth Service (5001)
const AUTH_API_URL = process.env.REACT_APP_AUTH_API_URL;

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      // ✅ URL updated to use AUTH_API_URL variable
      const res = await axios.get(`${AUTH_API_URL}/auth/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(res.data);
    } catch (err) {
      alert('Failed to load customers: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      const token = localStorage.getItem('token');
      // ✅ URL updated to use AUTH_API_URL variable
      await axios.delete(`${AUTH_API_URL}/auth/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(customers.filter((c) => c.id !== id));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  if (localStorage.getItem('role') !== 'super') {
    return <p>You do not have permission to access this page.</p>;
  }

  return (
    <div className="full-page-background">
      <div className="customer-list-page">
        <h2>Customer Accounts</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>First Name</th>
              <th>Middle Initial</th>
              <th>Last Name</th>
              <th>Username</th>
              <th>Policy Accepted</th>
              <th>Created At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.first_name}</td>
                <td>{c.middle_initial}</td>
                <td>{c.last_name}</td>
                <td>{c.username}</td>
                <td>{c.policy_accepted ? 'Yes' : 'No'}</td>
                <td>{new Date(c.created_at).toLocaleString()}</td>
                <td>
                  <button className="delete-btn" onClick={() => handleDelete(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerList;
