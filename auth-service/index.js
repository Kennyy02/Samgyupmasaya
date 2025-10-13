 /**

 * Auth Service

 * Handles admin authentication (login/register) and customer detail lookup

 */



const express = require('express');

const cors = require('cors');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');

const { createPool } = require('mysql2/promise');

require('dotenv').config();



const app = express();

const PORT = process.env.PORT || 5001;



// ✅ Allow your frontend domain only

const allowedOrigins = [

    'https://samgyupmasaya.up.railway.app', // your deployed frontend

    'http://localhost:3000' // optional local testing

];



app.use(cors({

    origin: function (origin, callback) {

        // Allow requests with no origin (like mobile apps or curl requests)

        if (!origin || allowedOrigins.includes(origin)) {

            callback(null, true);

        } else {

            callback(new Error('CORS not allowed by policy'));

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

const JWT_SECRET = process.env.ENV_SECRET || 'supersecretkey';





// --------------------------------------------------

// --- AUTHENTICATION & AUTHORIZATION MIDDLEWARE ---

// --------------------------------------------------



/**

 * Middleware to verify JWT and attach user data to req.user

 */

function authenticateToken(req, res, next) {

    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];



    if (token == null) {

        return res.status(401).json({ error: 'Authorization token missing' });

    }



    jwt.verify(token, JWT_SECRET, (err, user) => {

        if (err) {

            console.error('JWT Verification Error:', err.message);

            return res.status(403).json({ error: 'Invalid or expired token' });

        }

        req.user = user; // { id, username, role }

        next();

    });

}



/**

 * Middleware to check if the authenticated user has the required role (e.g., 'super').

 */

function authorizeRole(requiredRole) {

    return (req, res, next) => {

        if (req.user.role !== requiredRole) {

            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });

        }

        next();

    };

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

        await db.query('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)', [

            username,

            hashedPassword,

            role || 'normal'

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



        const [rows] = await db.query('SELECT id, username, password_hash, role FROM admins WHERE username = ?', [username]);

        if (rows.length === 0) return res.status(401).json({ error: 'Invalid username or password' });



        const admin = rows[0];

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

            role: admin.role,

            adminId: admin.id

        });

    } catch (err) {

        console.error('LOGIN ERROR:', err);

        res.status(500).json({ error: 'Internal server error' });

    }

});





// ----------------------------------------------------------------------

// --- ADMIN & CUSTOMER MANAGEMENT ENDPOINTS (FIXED CUSTOMER QUERY) ---

// ----------------------------------------------------------------------



/**

 * GET list of all admins (Protected: Requires Super Admin role)

 * Route: /auth/admins

 */

app.get('/auth/admins', authenticateToken, authorizeRole('super'), async (req, res) => {

    try {

        // Select all admins but EXCLUDE the password hash

        const [admins] = await db.query('SELECT id, username, role, created_at FROM admins ORDER BY id DESC');

        res.json(admins);

    } catch (err) {

        console.error('Error fetching admin list:', err);

        res.status(500).json({ error: 'Failed to fetch admin list' });

    }

});



/**

 * GET list of all customers (Protected: Requires any authenticated admin)

 * Route: /auth/customers

 */

app.get('/auth/customers', authenticateToken, async (req, res) => {

    try {

        // FIX: Select ALL columns needed by the frontend table.

        const [rawCustomers] = await db.query(

            'SELECT id, first_name, last_name, middle_initial, username, policy_accepted, created_at FROM customers ORDER BY id DESC'

        );



        // FIX: The frontend expects all individual columns, so we map them directly.

        const customers = rawCustomers.map(c => ({

            id: c.id,

            first_name: c.first_name || '', 

            last_name: c.last_name || '',

            middle_initial: c.middle_initial || '',

            username: c.username || '', 

            policy_accepted: c.policy_accepted, 

            created_at: c.created_at,

        }));



        res.json(customers);

    } catch (err) {

        // Log the actual error that caused the 500 status

        console.error('❌ Error fetching customer list:', err.message);

        res.status(500).json({ error: 'Failed to fetch customer list due to a database issue. Check the columns: ' + err.message });

    }

});





// ------------------------------------------------------------

// --- INTER-SERVICE COMMUNICATION ENDPOINTS (For Order Service) ---

// ------------------------------------------------------------



/**

 * GET customer details by ID (Used by Order Service to map ID to Name/Email)

 * Route: /customer/:id/details

 */

app.get('/customer/:id/details', async (req, res) => {

    const { id } = req.params;

    try {

        // Fetch first_name, last_name, and gmail from the customers table

        const [rows] = await db.query('SELECT first_name, last_name, gmail FROM customers WHERE id = ?', [id]);



        if (rows.length === 0) {

            return res.status(404).json({ error: 'Customer not found' });

        }



        const customer = rows[0];



        // Match response keys with what the Order Service expects (Name and Email)

        res.json({

            // Combine first_name and last_name for the full name

            customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(), 

            customer_email: customer.gmail, // Use 'gmail' column for email

        });

    } catch (err) {

        console.error(`Error fetching details for customer ID ${id}:`, err);

        res.status(500).json({ error: 'Internal server error fetching customer details' });

    }

});





// --------------------------------------------------

// --- INITIALIZATION ---

// --------------------------------------------------



// ✅ Root route for checking service status

app.get('/', (req, res) => {

    res.send('✅ Auth Service is running.');

});





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



// 🚀 Initialize the app and start the server

initializeApp();
