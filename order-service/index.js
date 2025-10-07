// order-service/index.js
/**
 * Order Service
 * Handles online & onsite orders, analytics, and status updates.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();

// ✅ CORS FIX: allow Railway frontend and local dev
app.use(
  cors({
    origin: [
      'https://samgyupmasaya-frontend.up.railway.app', // your deployed frontend
      'http://localhost:3000', // for local testing
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);

app.use(express.json());

// ----------------------------------------------------------------------
// ✅ DATABASE CONFIGURATION: USE RAILWAY ENVIRONMENT VARIABLE
// ----------------------------------------------------------------------

const dbUrl = process.env.MYSQL_URL;
if (!dbUrl) {
  console.error('❌ MYSQL_URL environment variable is not set. Exiting.');
  process.exit(1);
}

const db = mysql.createPool(dbUrl);

db.getConnection()
  .then((conn) => {
    console.log('✅ Order Service: Connected to MySQL (using MYSQL_URL)');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Order Service DB Connection Error:', err.message);
    process.exit(1);
  });

// ----------------------------------------------------------------------
// ✅ EMAIL CONFIGURATION: Use Environment Variables for Security
// ----------------------------------------------------------------------

const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL || 'samgyupmasaya@gmail.com';
const RESTAURANT_PASS = process.env.RESTAURANT_PASS || ''; // set this in Railway Variables!

if (!RESTAURANT_PASS) {
  console.warn('⚠️ WARNING: RESTAURANT_PASS not set. Email sending will fail.');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: RESTAURANT_EMAIL,
    pass: RESTAURANT_PASS,
  },
});

// ----------------------------------------------------------------------
// ✅ INTER-SERVICE CONFIGURATION
// ----------------------------------------------------------------------
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5004';

// ----------------------------------------------------------------------
// ✅ EMAIL FUNCTION
// ----------------------------------------------------------------------
async function sendOrderStatusEmail(toEmail, orderId, newStatus) {
  const subject = `Order #${orderId} Update: ${newStatus}`;

  const statusMessage =
    newStatus === 'Preparing'
      ? 'Our kitchen staff is now preparing your meal! Expect it soon.'
      : newStatus === 'Delivered'
      ? 'Your order has been delivered! Thank you for choosing SamgyupMasaya.'
      : '';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color:#FFC72C;">SamgyupMasaya Order Update</h2>
      <p>Dear Customer, your order <strong>#${orderId}</strong> is now <b>${newStatus}</b>.</p>
      <p>${statusMessage}</p>
      <p>Thank you for ordering with us!</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SamgyupMasaya" <${RESTAURANT_EMAIL}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    });
    console.log(`✅ Email sent for Order #${orderId} to ${toEmail}`);
  } catch (err) {
    console.error(`❌ Email send failed for Order #${orderId}:`, err.message);
  }
}

// ----------------------------------------------------------------------
// ✅ HELPER FUNCTIONS
// ----------------------------------------------------------------------
async function getProductId(productName, productType) {
  try {
    const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/products/search`, {
      params: { q: productName },
    });
    const match = data.find((p) => p.name === productName && p.type === productType);
    return match ? match.id : null;
  } catch (err) {
    console.error(`Error fetching product ID for ${productName}:`, err.message);
    return null;
  }
}

async function getCustomerDetails(customerId) {
  try {
    const { data } = await axios.get(`${AUTH_SERVICE_URL}/customer/${customerId}/details`);
    return data;
  } catch (err) {
    console.error(`Error fetching customer details for ID ${customerId}:`, err.message);
    throw new Error('Failed to retrieve customer details from Auth Service.');
  }
}

// ----------------------------------------------------------------------
// ✅ SEARCH ORDERS
// ----------------------------------------------------------------------
app.get('/orders/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Missing query parameter 'q'." });

  try {
    const [online] = await db.execute(
      `SELECT *, 'online' AS type FROM order_history_online
       WHERE customer_name LIKE ? OR product_name LIKE ?`,
      [`%${q}%`, `%${q}%`]
    );
    const [onsite] = await db.execute(
      `SELECT *, 'onsite' AS type FROM order_history_onsite
       WHERE customer_name LIKE ? OR product_name LIKE ?`,
      [`%${q}%`, `%${q}%`]
    );
    res.json([...online, ...onsite]);
  } catch (err) {
    console.error('Error searching orders:', err);
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

// ----------------------------------------------------------------------
// ✅ PLACE ONLINE ORDER
// ----------------------------------------------------------------------
app.post('/orders/online', async (req, res) => {
  const {
    customerId,
    address,
    contact_number,
    category,
    product_name,
    quantity,
    price,
    payment_method,
    status = 'Pending',
  } = req.body;

  if (!customerId || !address || !contact_number || !product_name || !category || !quantity || !price || !payment_method) {
    return res.status(400).json({ error: 'Missing required order data.' });
  }

  try {
    const { customer_name, customer_email } = await getCustomerDetails(customerId);
    const productId = await getProductId(product_name, 'online');
    if (!productId) return res.status(404).json({ error: `Product not found: ${product_name}` });

    const [result] = await db.execute(
      `INSERT INTO order_history_online
       (customer_name, address, contact_number, customer_email, category, product_name,
        quantity, price, payment_method, status, product_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_name, address, contact_number, customer_email, category, product_name, quantity, price, payment_method, status, productId]
    );

    res.json({ message: 'Online order recorded', orderId: result.insertId });
  } catch (err) {
    console.error('Error placing online order:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// ✅ SERVER START
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`🚀 Order Service running on port ${PORT}`));
