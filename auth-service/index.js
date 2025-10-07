/**
 * Auth Service
 * Handles admin authentication (login/register)
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// ✅ Allow your frontend domain only
const allowedOrigins = [
  'https://frontend-production-e94b.up.railway.app', // your deployed frontend
  'http://localhost:3000' // optional local testing
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ✅ MySQL connection pool
const db = mysql.createPool({
  host: process.env.MYSQLHOST || 'localhost',
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'samgyup_auth',
  port: process.env.MYSQLPORT || 3306
});

// ✅ Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * REGISTER endpoint (optional for initial admin setup)
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [existingUser] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO admins (username, password, role) VALUES (?, ?, ?)', [
      username,
      hashedPassword,
      role || 'admin'
    ]);

    res.json({ message: 'Admin registered successfully' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * LOGIN endpoint
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Please provide username and password' });

    const [rows] = await db.query('SELECT * FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid username or password' });

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: admin.role
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Root route for checking service status
app.get('/', (req, res) => {
  res.send('✅ Auth Service is running.');
});

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
