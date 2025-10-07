/**
 * Auth Service
 * Handles admin authentication for the system.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

// ----------------------------------------------------------------------
// ✅ CORS CONFIGURATION (Allow frontend + local dev)
// ----------------------------------------------------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ----------------------------------------------------------------------
// ✅ MYSQL CONNECTION (using Railway-provided env variable MYSQL_URL)
// ----------------------------------------------------------------------
let pool;

async function initDB() {
  try {
    pool = mysql.createPool({
      uri: process.env.MYSQL_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    console.log('✅ Connected to MySQL database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}
initDB();

// ----------------------------------------------------------------------
// ✅ LOGIN ENDPOINT
// ----------------------------------------------------------------------
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required.' });

  try {
    const [rows] = await pool.query('SELECT * FROM admin WHERE email = ?', [email]);

    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const admin = rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      role: admin.role,
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// ----------------------------------------------------------------------
// ✅ TOKEN VERIFICATION ENDPOINT
// ----------------------------------------------------------------------
app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    res.status(200).json({ message: 'Token valid', user: decoded });
  });
});

// ----------------------------------------------------------------------
// ✅ SERVER LISTEN (PORT = 5001 by default for Railway)
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`✅ Auth Service running on port ${PORT}`);
});
