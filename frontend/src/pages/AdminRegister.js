import React, { useState } from 'react';
import axios from 'axios';
import './AdminRegister.css';

const AdminRegister = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleRegister = async () => {
    if (!credentials.username || !credentials.password) {
      setMessage('❌ Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5001/auth/register',
        credentials,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message || '✅ New admin added successfully');
      setCredentials({ username: '', password: '' });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleRegister();
  };

  // Only super admins can access
  if (localStorage.getItem('role') !== 'super') {
    return <p className="no-access">You do not have permission to access this page.</p>;
  }

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Add New Admin</h2>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={credentials.username}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={credentials.password}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        />
        <button className="register-button" onClick={handleRegister}>
          Add Admin
        </button>
        {message && (
          <p
            className={`message ${
              message.includes('successfully') ? 'success' : 'error'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminRegister;
