const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();

// --------------------------------------------------
// ✅ IMPROVED CORS CONFIGURATION
// This version automatically allows your frontend deployment subdomain
// (e.g. any "frontend-production-xxxx.up.railway.app") and localhost
// --------------------------------------------------
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server or curl
    const allowed = [
      "http://localhost:3000",
    ];

    const isFrontendRailway =
      origin.includes("frontend-production") && origin.includes(".up.railway.app");

    if (allowed.includes(origin) || isFrontendRailway) {
      callback(null, true);
    } else {
      console.error(`🚫 CORS Blocked: Unauthorized origin -> ${origin}`);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// --------------------------------------------------
// Configuration
// --------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "your_customer_secret_key";

// --------------------------------------------------
// ✅ DATABASE CONNECTION: USE RAILWAY ENVIRONMENT VARIABLE
// --------------------------------------------------
const dbUrl = process.env.MYSQL_URL;

if (!dbUrl) {
  console.error("❌ FATAL ERROR: MYSQL_URL environment variable is not set. Exiting.");
  process.exit(1);
}

const db = mysql.createPool(dbUrl).promise();

// Connection Check
db.getConnection()
  .then(() => console.log("✅ Customer Auth Service: MySQL connected successfully"))
  .catch((err) => console.error("❌ MySQL connection error:", err.message));

// --------------------------------------------------
// Helper Functions
// --------------------------------------------------
function validatePassword(password) {
  const rules = [
    { regex: /.{8,}/, message: "Password must be at least 8 characters long" },
    { regex: /[A-Z]/, message: "Password must contain at least one uppercase letter" },
    { regex: /[a-z]/, message: "Password must contain at least one lowercase letter" },
    { regex: /[0-9]/, message: "Password must contain at least one number" },
    { regex: /[^A-Za-z0-9]/, message: "Password must contain at least one special character" },
  ];
  for (const rule of rules) {
    if (!rule.regex.test(password)) return rule.message;
  }
  return null;
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// --------------------------------------------------
// Routes
// --------------------------------------------------

// Registration
app.post("/register", async (req, res) => {
  const { username, password, acceptPolicy, firstName, lastName, middleInitial, gmail } = req.body;

  if (!username || !password || !firstName || !lastName || !gmail) {
    return res.status(400).json({
      message: "Username, password, first name, last name, and email are required",
    });
  }

  if (!isValidEmail(gmail)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!acceptPolicy) {
    return res.status(400).json({ message: "You must accept the Terms & Privacy Policy" });
  }

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  try {
    const [existing] = await db.execute(
      "SELECT id, username, gmail FROM customers WHERE username = ? OR gmail = ?",
      [username, gmail]
    );

    if (existing.length) {
      const userExists = existing.some((row) => row.username === username);
      const emailExists = existing.some((row) => row.gmail === gmail);
      if (userExists) return res.status(409).json({ message: "Username already taken" });
      if (emailExists) return res.status(409).json({ message: "Email address already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const policyValue = acceptPolicy ? 1 : 0;

    await db.execute(
      `INSERT INTO customers
        (first_name, last_name, middle_initial, username, password_hash, gmail, policy_accepted)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, middleInitial || "", username, hashedPassword, gmail, policyValue]
    );

    res.status(201).json({ message: "Customer registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Internal server error during registration" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, username, password_hash FROM customers WHERE username = ?",
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const customer = rows[0];
    const isValid = await bcrypt.compare(password, customer.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: customer.id, username: customer.username, type: "customer" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Daily User Registration Analytics
app.get("/analytics/users-daily", async (_req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT DATE(created_at) AS date, COUNT(id) AS count
      FROM customers
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching daily user registrations:", err);
    res.status(500).json({ error: "Failed to fetch daily user registrations" });
  }
});

// Customer Details for Order Service
app.get("/customer/:customerId/details", async (req, res) => {
  const { customerId } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT first_name, last_name, gmail FROM customers WHERE id = ?`,
      [customerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customer = rows[0];
    const customerDetails = {
      customer_name: `${customer.first_name} ${customer.last_name}`,
      customer_email: customer.gmail,
    };

    res.json(customerDetails);
  } catch (err) {
    console.error("Error fetching customer details:", err);
    res.status(500).json({ error: "Internal server error fetching customer details." });
  }
});

// Customer Address Endpoints
app.get("/customer/:customerId/addresses", async (req, res) => {
  const { customerId } = req.params;
  try {
    const [addresses] = await db.execute(
      "SELECT id, full_name, full_address, contact_number FROM customer_addresses WHERE customer_id = ? ORDER BY id DESC",
      [customerId]
    );
    res.json(addresses);
  } catch (err) {
    console.error("Error fetching addresses:", err);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

app.post("/customer/:customerId/addresses", async (req, res) => {
  const { customerId } = req.params;
  const { fullName, fullAddress, contact } = req.body;
  try {
    const [result] = await db.execute(
      "INSERT INTO customer_addresses (customer_id, full_name, full_address, contact_number) VALUES (?, ?, ?, ?)",
      [customerId, fullName, fullAddress, contact]
    );
    res.status(201).json({ id: result.insertId, message: "Address saved successfully" });
  } catch (err) {
    console.error("Error saving address:", err);
    res.status(500).json({ error: "Failed to save address" });
  }
});

app.delete("/customer/addresses/:addressId", async (req, res) => {
  const { addressId } = req.params;
  try {
    await db.execute("DELETE FROM customer_addresses WHERE id = ?", [addressId]);
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(500).json({ error: "Failed to delete address" });
  }
});

// --------------------------------------------------
// Start Server
// --------------------------------------------------
const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`🚀 Customer Auth Service running on port ${PORT}`);
});
