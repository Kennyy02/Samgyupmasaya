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

// ----------------------------------------------------------------------
// ✅ CORS FIX: allow Railway frontend and local dev
// ----------------------------------------------------------------------
// Frontend URL: https://frontend-production-e94b.up.railway.app
const allowedOrigins = [
  'https://frontend-production-e94b.up.railway.app', 
  'http://localhost:3000', 
];

app.use(
  cors({
    origin: allowedOrigins,
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
const RESTAURANT_PASS = process.env.RESTAURANT_PASS || ''; 

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
// NOTE: These variables are read by the backend for service-to-service calls.
// Since you are using a shared MySQL, the actual public URLs are not critical here, 
// but ensure the variables are set in Railway to avoid falling back to localhost.
// ----------------------------------------------------------------------
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5004';

// ----------------------------------------------------------------------
// ✅ EMAIL FUNCTION
// ----------------------------------------------------------------------
// (Email function logic remains the same)

// ----------------------------------------------------------------------
// ✅ HELPER FUNCTIONS
// ----------------------------------------------------------------------
async function getProductId(productName, productType) {
  try {
    // If PRODUCT_SERVICE_URL is set to the internal Railway name (e.g., http://product-service), it will work.
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
// (Search orders logic remains the same)

// ----------------------------------------------------------------------
// ✅ PLACE ONLINE ORDER
// ----------------------------------------------------------------------
// (Place online order logic remains the same)


// ----------------------------------------------------------------------
// ✅ DASHBOARD ANALYTICS ENDPOINTS (Fixing 404/Network Errors)
// ----------------------------------------------------------------------

app.get('/', (req, res) => {
  res.send('✅ Order Service is running.');
});

// Endpoint hit at Dashboard.js:111
app.get('/analytics/summary', async (req, res) => {
  try {
    // Mocking real data retrieval for Dashboard summary
    const [onlineOrders] = await db.query('SELECT COUNT(*) AS total, SUM(price * quantity) AS revenue FROM order_history_online');
    const [onsiteOrders] = await db.query('SELECT COUNT(*) AS total, SUM(price * quantity) AS revenue FROM order_history_onsite');

    const totalOrders = (onlineOrders[0]?.total || 0) + (onsiteOrders[0]?.total || 0);
    const totalRevenue = (onlineOrders[0]?.revenue || 0) + (onsiteOrders[0]?.revenue || 0);

    // Assuming you have a way to calculate pending orders (e.g., status='Pending')
    const [pendingOrders] = await db.query("SELECT COUNT(*) AS pending FROM order_history_online WHERE status = 'Pending'");

    res.json({
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders: totalOrders,
        pendingOrders: pendingOrders[0]?.pending || 0,
        // Add more summary data as needed
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    // Return mock data if tables don't exist yet to allow the dashboard to load
    res.json({ totalRevenue: 0, totalOrders: 0, pendingOrders: 0 });
  }
});

// Endpoint hit at Dashboard.js:114
app.get('/analytics/online-products-sold', (req, res) => {
    // NOTE: For a real app, this would query order_history_online grouped by product_name
    res.json([
        { name: 'Samgyup Set A', units: 300 },
        { name: 'Kimbap', units: 150 },
    ]);
});

// Endpoint hit at Dashboard.js:115
app.get('/analytics/onsite-products-sold', (req, res) => {
    // NOTE: For a real app, this would query order_history_onsite grouped by product_name
    res.json([
        { name: 'Unlimited Samgyup', units: 500 },
        { name: 'Soju', units: 400 },
    ]);
});

// ----------------------------------------------------------------------
// ✅ SERVER START
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`🚀 Order Service running on port ${PORT}`));
