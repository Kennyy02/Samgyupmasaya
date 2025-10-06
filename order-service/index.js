// order-service/index.js
/**
 * Order Service
 * Handles online & onsite orders, analytics, and status updates.
 */

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const axios = require('axios'); // <-- AXIOS IS CRUCIAL FOR FETCHING CUSTOMER DETAILS
const nodemailer = require('nodemailer'); 

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------------------------------------------------
// ✅ DATABASE CONFIGURATION: USE RAILWAY ENVIRONMENT VARIABLE
// ----------------------------------------------------------------------

const dbUrl = process.env.MYSQL_URL; 

if (!dbUrl) {
    console.error("❌ FATAL ERROR: MYSQL_URL environment variable is not set. Exiting.");
    process.exit(1); 
}

// Use the full URL string. The `mysql2` library handles the parsing.
const db = mysql.createPool(dbUrl);

db.getConnection()
    .then(conn => {
        console.log('✅ Order Service: Connected to MySQL (using MYSQL_URL)');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Order Service DB Connection Error:', err.message);
        process.exit(1);
    });

// ------------------------------------
// --- EMAIL CONFIGURATION (IMPORTANT) ---
// ------------------------------------
const RESTAURANT_EMAIL = 'samgyupmasaya@gmail.com';
const RESTAURANT_PASS = 'zetsngkxipsergrm'; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: RESTAURANT_EMAIL,
        pass: RESTAURANT_PASS, // <-- Using App Password here
    },
});

// ----------------------------------------------------------------------
// ✅ INTER-SERVICE CONFIGURATION: USE RAILWAY INTERNAL DOMAINS
// ----------------------------------------------------------------------

// Ensure these environment variables are set in your Railway project to the
// internal addresses/domain names of your other deployed services (e.g., product-service.up.railway.app or service-name:port)
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:5002'; // Fallback to localhost for local testing
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5004'; // Fallback to localhost for local testing


/**
 * Sends an email notification to the customer about their order status change.
 * ... (function implementation remains the same)
 */
async function sendOrderStatusEmail(toEmail, orderId, newStatus) {
    const subject = `Order #${orderId} Update: ${newStatus}`;
    
    // Determine the main message based on status
    let statusMessage = '';
    if (newStatus === 'Preparing') {
        statusMessage = 'Our kitchen staff is now busy preparing your delicious meal! Expect it soon.';
    } else if (newStatus === 'Delivered') {
        statusMessage = 'Your order has been successfully delivered! Thank you for choosing SamgyupMasaya.';
    }

    // UPDATED: HTML Body with styles, logo area removed
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            
            <div style="background-color: #FFC72C; padding: 15px; text-align: center; border-bottom: 1px solid #eee;">
                <h1 style="margin: 0; color: black; font-size: 18px;">SamgyupMasaya Order Update</h1>
            </div>

            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333;">Dear Customer,</p>
                
                <p style="font-size: 16px; color: #333;">
                    We're happy to inform you that the status of your online order has been updated!
                </p>

                <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #FFC72C; border-radius: 5px;">
                    <h3 style="margin: 0; color: black; font-size: 18px;">New Status: 
                        <strong style="text-transform: uppercase;">${newStatus}</strong>
                    </h3>
                </div>
                
                <p style="font-size: 16px; color: #555; border-left: 3px solid #FFC72C; padding-left: 10px;">
                    ${statusMessage}
                </p>

                <p style="font-size: 16px; color: #333; margin-top: 30px;">
                    If you have any questions, please contact us at ${RESTAURANT_EMAIL}.
                </p>
            </div>

            <div style="background-color: #f7f7f7; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                <p style="margin: 0; font-size: 14px; color: #444; font-weight: bold;">Thank you for choosing SamgyupMasaya!</p>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #777;">&copy; SamgyupMasaya Restaurant</p>
            </div>
        </div>
    `;
    // Plain text version for compatibility
    const textBody = `
        Dear Customer,
        
        We're happy to inform you that the status of your online order has been updated!
        
        New Status: ${newStatus}
        
        Details:
        ${statusMessage}

        If you have any questions, please contact us at ${RESTAURANT_EMAIL}.
        
        Thank you!
        SamgyupMasaya Team
    `.trim();

    try {
        await transporter.sendMail({
            from: `"SamgyupMasaya" <${RESTAURANT_EMAIL}>`,
            to: toEmail,
            subject: subject,
            text: textBody,
            html: htmlBody,
            // Removed: attachments array
        });
        console.log(`✅ Email sent for Order #${orderId} to ${toEmail}. Status: ${newStatus}`);
    } catch (error) {
        console.error(`❌ Failed to send email for Order #${orderId} to ${toEmail}:`, error.message);
    }
}


// --------------------------------------------------
// --- Helper: Fetch Product ID from Product Service ---
// --------------------------------------------------
async function getProductId(productName, productType) {
    try {
        // ✅ Using environment variable for URL
        const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/products/search`, {
            params: { q: productName },
        });
        const match = data.find(
            p => p.name === productName && p.type === productType
        );
        return match ? match.id : null;
    } catch (err) {
        console.error(`Error fetching product ID for ${productName}:`, err.message);
        return null;
    }
}

// --------------------------------------------------
// --- Helper: Fetch Customer Details from Auth Service (FIXED HELPER) ---
// --------------------------------------------------
async function getCustomerDetails(customerId) {
    try {
        // ✅ Using environment variable for URL
        const { data } = await axios.get(`${AUTH_SERVICE_URL}/customer/${customerId}/details`);
        // Expected data format: { customer_name: 'First Last', customer_email: 'email@example.com' }
        return data;
    } catch (err) {
        console.error(`Error fetching customer details for ID ${customerId}:`, err.message);
        // Throw an error that includes the reason for the failure
        throw new Error('Failed to retrieve customer details from Auth Service.');
    }
}


// --- Order Search ---
app.get('/orders/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'." });

    const search = `%${query}%`;
    try {
        const [online] = await db.execute(
            `SELECT *, 'online' AS type FROM order_history_online
             WHERE customer_name LIKE ? OR product_name LIKE ?`,
            [search, search]
        );
        const [onsite] = await db.execute(
            `SELECT *, 'onsite' AS type FROM order_history_onsite
             WHERE customer_name LIKE ? OR product_name LIKE ?`,
            [search, search]
        );
        res.json([...online, ...onsite]);
    } catch (err) {
        console.error('Error searching orders:', err);
        res.status(500).json({ error: 'Failed to search orders' });
    }
});

// -------------------------------------
// --- Place Online Order (FIXED ROUTE) ---
// -------------------------------------
app.post('/orders/online', async (req, res) => {
    // ⚠️ customerId is now expected from the frontend, replacing customer_name/customer_email
    const {
        customerId, // <-- New: Customer ID from frontend local storage/token
        address,
        contact_number,
        category,
        product_name,
        quantity,
        price,
        payment_method,
        status = 'Pending', 
    } = req.body;

    // 1. Validate required fields, including the new customerId
    if (!customerId || !address || !contact_number || !product_name || !category || !quantity || !price || !payment_method) {
        return res.status(400).json({ error: 'Missing required order data.' });
    }

    try {
        // 2. Fetch customer details (Name and Email) from Auth Service
        const customerDetails = await getCustomerDetails(customerId);
        const customer_name = customerDetails.customer_name;
        const customer_email = customerDetails.customer_email;
        
        if (!customer_email) {
            // This is a safety check in case the Auth Service returned a name but no email
            return res.status(400).json({ error: 'Customer email is missing in the customer profile.' });
        }

        const productId = await getProductId(product_name, 'online');
        if (!productId)
            return res.status(404).json({ error: `Product not found: ${product_name}` });

        // 3. Insert the order using the fetched customer_name and customer_email
        const [result] = await db.execute(
            `INSERT INTO order_history_online
             (customer_name, address, contact_number, customer_email, category, product_name,
              quantity, price, payment_method, status, product_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customer_name, // Now dynamically fetched
                address,
                contact_number,
                customer_email, // Now dynamically fetched
                category,
                product_name,
                quantity,
                price,
                payment_method,
                status,
                productId,
            ]
        );

        res.json({ message: 'Online order recorded', orderId: result.insertId });
    } catch (err) {
        console.error('Error placing online order:', err);
        // Ensure we send back the descriptive error if the helper failed
        const errorMessage = err.message.includes('Failed to retrieve') 
            ? err.message 
            : 'Internal server error while placing order.';
        // We use 500 here if it's an internal failure (like Auth Service connection)
        // If the Auth Service endpoint is running, this should catch the internal Auth Service error
        res.status(500).json({ error: errorMessage }); 
    }
});

// --- Place Onsite Order ---
app.post('/orders/onsite', async (req, res) => {
    const { customer_name, table_id, number_of_persons, payment_status, items } = req.body;
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();
        const orderIds = [];

        for (const item of items) {
            const { name, quantity, price, category = 'Other' } = item;
            const total = category === 'Unlimited Rates'
                ? parseFloat(price) * parseFloat(number_of_persons)
                : parseFloat(quantity) * parseFloat(price);

            const productId = await getProductId(name, 'onsite');
            if (!productId) throw new Error(`Product not found: ${name}`);

            const [result] = await conn.execute(
                `INSERT INTO order_history_onsite
                 (table_number, customer_name, number_of_persons, category, product_name,
                  quantity, total_price, payment_status, change_status, product_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    table_id,
                    customer_name,
                    number_of_persons,
                    category,
                    name,
                    quantity,
                    total,
                    payment_status,
                    'Pending',
                    productId,
                ]
            );

            orderIds.push(result.insertId);
        }

        await conn.commit();
        console.log(`[BACKEND] Onsite order placed for table ${table_id}. IDs: ${orderIds.join(', ')}`);
        res.json({ message: 'Onsite order recorded', order_id: orderIds[0], all_order_ids: orderIds });
    } catch (err) {
        console.error('Error placing onsite order:', err);
        await conn.rollback();
        res.status(500).json({ error: 'Failed to place order. ' + err.message });
    } finally {
        conn.release();
    }
});

// --- Analytics Endpoints ---
app.get('/analytics/summary', async (req, res) => {
    try {
        const [[{ total: onlineCount }]] = await db.execute('SELECT COUNT(*) AS total FROM order_history_online');
        const [[{ total: onsiteCount }]] = await db.execute('SELECT COUNT(*) AS total FROM order_history_onsite');

        const [[{ onsite_sales }]] = await db.execute('SELECT IFNULL(SUM(total_price), 0) AS onsite_sales FROM order_history_onsite');
        const [[{ online_sales }]] = await db.execute('SELECT IFNULL(SUM(quantity * price), 0) AS online_sales FROM order_history_online');

        // Fix applied here: Use parseFloat() to ensure values are numbers
        const totalSales = parseFloat(onsite_sales) + parseFloat(online_sales);

        res.json({
            totalOnlineOrders: onlineCount,
            totalOnsiteOrders: onsiteCount,
            overallSales: totalSales.toFixed(2),
        });
    } catch (err) {
        console.error('Error fetching analytics summary:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/analytics/online-products-sold', async (_, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT product_name, SUM(quantity) AS total_quantity
             FROM order_history_online
             GROUP BY product_name
             ORDER BY total_quantity DESC
             LIMIT 5`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching online products sold:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.get('/analytics/onsite-products-sold', async (_, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT product_name, SUM(quantity) AS total_quantity
             FROM order_history_onsite
             GROUP BY product_name
             ORDER BY total_quantity DESC
             LIMIT 5`
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching onsite products sold:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// --- Fetch Orders ---
app.get('/orders/online', async (_, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM order_history_online ORDER BY ordered_at DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching online orders:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders/onsite', async (_, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM order_history_onsite ORDER BY ordered_at DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching onsite orders:', err);
        res.status(500).json({ error: err.message });
    }
});

// -------------------------------------------
// --- Update Order Status (ONLINE - UPDATED) ---
// -------------------------------------------
app.put('/orders/online/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    try {
        // 1. Get the current email and status before updating
        const [currentRows] = await db.execute(
            'SELECT customer_email, status FROM order_history_online WHERE id = ?',
            [id]
        );

        if (!currentRows.length) return res.status(404).json({ message: 'Order not found' });

        const { customer_email, status: currentStatus } = currentRows[0];

        // 2. Update the status
        const [result] = await db.execute(
            'UPDATE order_history_online SET status = ? WHERE id = ?',
            [status, id]
        );

        if (!result.affectedRows) return res.status(404).json({ message: 'Order not found' });

        // 3. Send email notification if status changed to 'Preparing' or 'Delivered'
        const shouldSendEmail =
            (status === 'Preparing' && currentStatus !== 'Preparing') ||
            (status === 'Delivered' && currentStatus !== 'Delivered');

        if (customer_email && shouldSendEmail) {
            await sendOrderStatusEmail(customer_email, id, status);
        }

        res.json({ message: `Order ${id} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating online order status:', err);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

app.put('/orders/onsite/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    try {
        const [result] = await db.execute(
            'UPDATE order_history_onsite SET change_status = ? WHERE id = ?',
            [status, id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Onsite order not found' });
        res.json({ message: `Onsite order ${id} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating onsite order status:', err);
        res.status(500).json({ error: 'Failed to update onsite order status' });
    }
});

// --- Update Payment Status (Onsite) ---
app.put('/orders/onsite/:id/payment', async (req, res) => {
    const { id } = req.params;
    const { payment_status } = req.body;
    if (!payment_status) return res.status(400).json({ error: 'Payment status is required' });

    try {
        const [result] = await db.execute(
            'UPDATE order_history_onsite SET payment_status = ? WHERE id = ?',
            [payment_status, id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Onsite order not found' });
        res.json({ message: `Onsite order ${id} payment status updated to ${payment_status}` });
    } catch (err) {
        console.error('Error updating onsite order payment status:', err);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// --- Fetch Order Status ---
app.get('/orders/online/:id/status', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(
            'SELECT status FROM order_history_online WHERE id = ?',
            [id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Order not found' });
        res.json({ status: rows[0].status });
    } catch (err) {
        console.error('Error fetching online order status:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders/online/status/:customerName', async (req, res) => {
    const { customerName } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT id, status, ordered_at
             FROM order_history_online
             WHERE customer_name = ?
             ORDER BY ordered_at DESC`,
            [customerName]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching customer online order status:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/orders/onsite/status/:tableId', async (req, res) => {
    const { tableId } = req.params;
    try {
        const [rows] = await db.execute(
            `SELECT id, change_status AS status, ordered_at
             FROM order_history_onsite
             WHERE table_number = ?
             ORDER BY ordered_at DESC`,
            [tableId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching onsite order status:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Start Server ---
const PORT = 5003;
app.listen(PORT, () => console.log(`🚀 Order Service running on port ${PORT}`));
