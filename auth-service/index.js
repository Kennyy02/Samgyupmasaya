const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { URL } = require('url');

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------
// ✅ DATABASE CONFIGURATION: USE RAILWAY ENVIRONMENT VARIABLE
// ----------------------------------------------------------------------

const fullUrl = process.env.MYSQL_URL;

if (!fullUrl) {
    console.error("FATAL ERROR: MYSQL_URL environment variable is not set. Exiting.");
    process.exit(1); // Stop the service if connection string is missing
}

// Parse the full connection URL provided by Railway
const dbUrl = new URL(fullUrl);

// ----------------------------------------------------------------------
// 💡 CRITICAL FIX: Use the single database name provided by Railway (e.g., 'railway')
// The default database name can be extracted from the URL path, or assumed 'railway'.
// We use the environment variable DB_NAME if set, otherwise we default to 'railway'.
// ----------------------------------------------------------------------
const DEFAULT_RAILWAY_DB_NAME = dbUrl.pathname.substring(1) || 'railway';

// This variable allows Railway or a local .env file to override the database name
// which is useful when testing locally or using a different setup.
const SHARED_DB_NAME = process.env.DB_NAME || DEFAULT_RAILWAY_DB_NAME;


// Base configuration derived from the URL (host, user, password, port)
const baseConfig = {
    host: dbUrl.hostname,
    user: dbUrl.username,
    password: dbUrl.password,
    port: dbUrl.port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// MySQL connection for Admin data (auth_db schema)
// FIX: We are now connecting to the shared SHARED_DB_NAME ('railway')
const db = mysql.createPool({
    ...baseConfig,
    database: SHARED_DB_NAME,
}).promise();

// MySQL connection for Customer data (customer_auth_db schema)
// FIX: We are now connecting to the shared SHARED_DB_NAME ('railway')
const customerDb = mysql.createPool({
    ...baseConfig,
    database: SHARED_DB_NAME,
}).promise();


// ----------------------------------------------------------------------
// ✅ CONNECTION CHECK & SERVICE START
// ----------------------------------------------------------------------

// Check Admin DB connection
db.getConnection()
  .then(() => console.log(`Auth Service: Connected to Admin DB (using schema: ${SHARED_DB_NAME})`))
  .catch((err) => console.error('Auth Service Admin DB Error:', err.message));

// Check Customer DB connection
customerDb.getConnection()
  .then(() => console.log(`Auth Service: Connected to Customer DB (using schema: ${SHARED_DB_NAME})`))
  .catch((err) => console.error('Auth Service Customer DB Error:', err.message));

// ✅ Middleware to verify JWT
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, 'supersecretkey', (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    next();
  });
}

// ✅ Login
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: rows[0].id, role: rows[0].role },
      'supersecretkey',
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
      return res.status(403).json({ error: 'Only super admins can add new admins' });
    }

    const hash = await bcrypt.hash(password, 10);
    await db.execute(
      "INSERT INTO admins (username, password_hash, role) VALUES (?, ?, 'normal')",
      [username, hash]
    );

    res.json({ message: 'New admin registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get all admins (super only)
app.get('/auth/admins', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res.status(403).json({ error: 'Only super admins can view admin list' });
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
      return res.status(403).json({ error: 'Only super admins can delete admins' });
    }

    const { id } = req.params;
    await db.execute('DELETE FROM admins WHERE id = ?', [id]);
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------
    ✅ Customer Management (super admin only)
    Table: customers
    Columns: id | username | password_hash | policy_accepted | created_at
-------------------------------------------------- */

// Get all customers
app.get('/auth/customers', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res.status(403).json({ error: 'Only super admins can view customers' });
    }

    // Use the customerDb connection
    const [rows] = await customerDb.execute(
      // ADDED THE NEW COLUMNS HERE
      'SELECT id, first_name, last_name, middle_initial, username, policy_accepted, created_at FROM customers'
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch customers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a customer
app.delete('/auth/customers/:id', verifyToken, async (req, res) => {
  try {
    if (req.adminRole !== 'super') {
      return res.status(403).json({ error: 'Only super admins can delete customers' });
    }

    const { id } = req.params;
    // Use the customerDb connection
    await customerDb.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----------------------------------------------------------------------
// ✅ CRITICAL FIX: Use PORT environment variable for Railway deployment
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
