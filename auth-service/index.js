/**
 * Auth Service
 * Handles admin authentication (login/register)
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2'); 
const { createPool } = require('mysql2/promise'); 
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

// --------------------------------------------------
// ✅ DATABASE CONNECTION: USE RAILWAY'S MYSQL_URL
// --------------------------------------------------
const dbUrl = process.env.MYSQL_URL;

if (!dbUrl) {
    console.error("❌ FATAL ERROR: MYSQL_URL environment variable is not set. Exiting.");
    process.exit(1);
}

// MySQL connection pool created from the URL
const db = createPool(dbUrl); 

// ✅ Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * Function to initialize the application and test database connection
 */
async function initializeApp() {
    try {
        const connection = await db.getConnection();
        console.log('✅ Connected successfully to MySQL database using MYSQL_URL.');
        connection.release();

        app.listen(PORT, () => {
            console.log(`🚀 Auth Service running on port ${PORT}`);
        });

    } catch (err) {
        console.error('❌ Failed to connect to MySQL database:', err.message);
        process.exit(1);
    }
}


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
    // FIX 1: Use password_hash column for insertion
    await db.query('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)', [
      username,
      hashedPassword,
      role || 'normal' // Using 'normal' as default based on ENUM('super','normal')
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

    // FIX 2: Explicitly select password_hash column (even though SELECT * works)
    const [rows] = await db.query('SELECT id, username, password_hash, role FROM admins WHERE username = ?', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid username or password' });

    const admin = rows[0];
    // FIX 3: Use the correct column name admin.password_hash for comparison
    const isMatch = await bcrypt.compare(password, admin.password_hash); 
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

// 🚀 Initialize the app and start the server
initializeApp();
