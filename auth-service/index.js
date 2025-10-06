const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection for Admin data
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'auth_db',
}).promise();

// MySQL connection for Customer data
const customerDb = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '12345',
  database: 'customer_auth_db',
}).promise();

db.getConnection()
  .then(() => console.log('Auth Service: Connected to Admin DB'))
  .catch((err) => console.error('Auth Service DB Error:', err));

customerDb.getConnection()
  .then(() => console.log('Auth Service: Connected to Customer DB'))
  .catch((err) => console.error('Auth Service Customer DB Error:', err));

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

app.listen(5001, () => console.log('Auth Service running on port 5001'));