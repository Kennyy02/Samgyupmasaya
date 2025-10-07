/**
 * Auth Service
 * Handles admin and customer authentication, authorization, and management.
 */

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { URL } = require('url');

const app = express();

// ----------------------------------------------------------------------
// ✅ CORS CONFIGURATION (Frontend access from Railway + local)
// ----------------------------------------------------------------------
app.use(
  cors({
    origin: [
      'https://samgyupmasaya-frontend.up.railway.app', // ✅ deployed React frontend
      'http://localhost:3000', // ✅ local development
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// ----------------------------------------------------------------------
// ✅ DATABASE CONFIGURATION (Railway Environment)
// ----------------------------------------------------------------------
const fullUrl = process.env.MYSQL_URL;

if (!fullUrl) {
  console.error('❌ FATAL ERROR: MYSQL_URL not set in environment variables.');
  process.exit(1);
}

const dbUrl = new URL(fullUrl);
const DEFAULT_RAILWAY_DB_NAME = dbUrl.pathname.substring(1) || 'railway';
const SHARED_DB_NAME = process.env.DB_NAME || DEFAULT_RAILWAY_DB_NAME;

const baseConfig = {
  host: dbUrl.hostname,
  user: dbUrl.username,
  password: dbUrl.password,
  port: dbUrl.port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// ✅ Shared database pools (Admin + Customer)
const db = mysql.createPool({
  ...baseConfig,
  database: SHARED_DB_NAME,
}).promise();

const customerDb = mysql.createPool({
  ...baseConfig,
  database: SHARED_DB_NAME,
}).promise();

// ----------------------------------------------------------------------
// ✅ CONNECTION CHECK
// ----------------------------------------------------------------------
db.getConnection()
  .then(() =>
    console.log(`✅ Auth Service: Connected to Admin DB (schema: ${SHARED_DB_NAME})`)
  )
  .catch((err) => console.error('❌ Auth Service Admin DB Error:', err.message));

customerDb
  .getConnection()
  .then(() =>
    console.log(`✅ Auth Service: Connected to Customer DB (schema: ${SHARED_DB_NAME})`)
  )
  .catch((err) =>
    console.error('❌ Auth Service Customer DB Error:', err.message)
  );

// ----------------------------------------------------------------------
// ✅ JWT Middleware
// ----------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    next();
  });
}

// ----------------------------------------------------------------------
// ✅ ROUTES
// ----------------------------------------------------------------------

// Health check
app.get('/', (req, res) => {
  res.send('✅ Auth Service Running Successfully!');
});

// ✅ Login (Admin)
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM admins WHERE username = ?', [
      username,
    ]);
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: rows[0].id, role: rows[0].role },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, role: rows[0].role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Register new admin (super only)
app.post('/auth/register', verifyToken, async (req, res) => {
  const { username, password } = req.body;
  try {
    if (req.adminRole !== 'super') {
      return res
        .status(403)
        .json({ error: 'Only super admins can add new admins' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      "INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'normal')",
      [username, hash]
    );

    res.json({ message: '✅ New admin registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all admins (super only)
app.get('/auth/admins', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res
        .status(403)
        .json({ error: 'Only super admins can view admin list' });
    }

    const [admins] = await db.execute(
      'SELECT id, username, role, created_at FROM admins'
    );
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete an admin (super only)
app.delete('/auth/admins/:id', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res
        .status(403)
        .json({ error: 'Only super admins can delete admins' });
    }

    const { id } = req.params;
    await db.execute('DELETE FROM admins WHERE id = ?', [id]);
    res.json({ message: '✅ Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// ✅ Customer Management (super admin only)
// ----------------------------------------------------------------------

// Get all customers
app.get('/auth/customers', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res
        .status(403)
        .json({ error: 'Only super admins can view customers' });
    }

    const [rows] = await customerDb.execute(
      'SELECT id, first_name, last_name, middle_initial, username, policy_accepted, created_at FROM customers'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a customer
app.delete('/auth/customers/:id', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res
        .status(403)
        .json({ error: 'Only super admins can delete customers' });
    }

    const { id } = req.params;
    await customerDb.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: '✅ Customer deleted successfully' });
  } catch (err) {
    console.error('❌ Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------
// ✅ SERVER START (Railway-compatible)
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Auth Service running on port ${PORT}`));
