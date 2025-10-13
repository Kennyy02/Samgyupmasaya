// index.js
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2/promise'); // Using promise-based version
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // 🔑 For JSON Web Tokens
const bcrypt = require('bcryptjs'); // 🔑 For password hashing

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// ✅ SECURITY CONFIGURATION
// --------------------------------------------------

// ✅ Allowed origins for CORS (MUST be updated for production)
const allowedOrigins = [
    // https://rbgonzales-pharmacy-production-a7b7.up.railway.app/
    'http://localhost:3000', 
    `http://localhost:${PORT}` // Self-origin
];

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key_for_pharm_inventory';
if (JWT_SECRET === 'your_default_secret_key_for_pharm_inventory') {
    console.warn("⚠️ WARNING: Using default JWT_SECRET. Please set process.env.JWT_SECRET in your .env file!");
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, postman, or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Check if origin includes a specific deployment base (e.g., railway, heroku)
            if (origin && (origin.includes('.railway.app') || origin.includes('your-domain.com'))) {
                 callback(null, true);
            } else {
                console.log(`CORS Error: Origin ${origin} not allowed`);
                callback(new Error('CORS not allowed by policy'));
            }
        }
    },
    credentials: true
}));

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// --------------------------------------------------
// ✅ DATABASE CONNECTION: USING MYSQL_URL
// --------------------------------------------------
const dbUrl = process.env.MYSQL_URL;

if (!dbUrl) {
    console.error("❌ FATAL ERROR: MYSQL_URL environment variable is not set. Using fallback connection details.");
    // Fallback to manual environment variables if MYSQL_URL is not set (less secure, but retains previous functionality)
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
         console.error("❌ FATAL ERROR: Neither MYSQL_URL nor all individual DB credentials are set. Exiting.");
         process.exit(1);
    }
}

// MySQL Connection Pool (using URL or individual params)
const pool = dbUrl ? mysql.createPool(dbUrl) : mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✅ Connected to MySQL database!');
        connection.release(); // Release the connection back to the pool
    })
    .catch(err => {
        console.error('❌ Error connecting to MySQL:', err.message);
        process.exit(1); // Exit the process if unable to connect to the database
    });


// --------------------------------------------------
// --- AUTHENTICATION & AUTHORIZATION MIDDLEWARE ---
// --------------------------------------------------

/**
 * Middleware to verify JWT and attach admin data to req.admin
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authorization token missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, admin) => {
        if (err) {
            // Log for server-side debugging
            console.error('JWT Verification Error:', err.message); 
            // Send 403 status to indicate token is invalid or expired
            return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
        }
        req.admin = admin; // { id, username, role }
        next();
    });
}

/**
 * Middleware to check if the authenticated admin has the required role (e.g., 'admin').
 */
function authorizeRole(requiredRole) {
    return (req, res, next) => {
        if (!req.admin || req.admin.role !== requiredRole) {
            return res.status(403).json({ message: `Forbidden: Only '${requiredRole}' role can perform this action.` });
        }
        next();
    };
}


// --------------------------------------------------
// --- FILE UPLOAD & STATIC SERVE ---
// --------------------------------------------------

// Serve static images from the 'uploads' directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir); // Create 'uploads' directory if it doesn't exist
}
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Files will be stored in the 'uploads' directory
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });


// --------------------------------------------------
// --- AUTHENTICATION ENDPOINTS (Admins) ---
// --------------------------------------------------

// POST for admin login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        // NOTE: The table is assumed to be named 'admins' to reflect the role
        const [rows] = await pool.query('SELECT id, username, password_hash, role FROM admins WHERE username = ?', [username]);
        const admin = rows[0];

        if (!admin) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin.id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: '12h' } // Token expires in 12 hours
        );

        res.json({ 
            message: 'Login successful!', 
            token,
            admin: { id: admin.id, username: admin.username, role: admin.role } 
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'An unexpected error occurred during login.', error: err.message });
    }
});


// --------------------------------------------------
// --- API Endpoints for Admin Management (Previously Users) ---
// --------------------------------------------------

// GET all admins (Protected: Requires any authenticated admin)
app.get('/api/admins', authenticateToken, async (req, res) => {
    try {
        // Exclude password_hash for security
        const [rows] = await pool.query('SELECT id, username, role FROM admins');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching admins:', err);
        res.status(500).json({ message: 'Error fetching admins', error: err.message });
    }
});

// POST a new admin (Protected: Requires 'admin' role)
app.post('/api/admins', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { username, password, role } = req.body;
        // Ensure role is a valid type (admin or cashier)
        if (!username || !password || (role !== 'admin' && role !== 'cashier')) {
            return res.status(400).json({ message: 'Username, password, and a valid role (admin or cashier) are required.' });
        }
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );
        res.status(201).json({ message: 'Admin added successfully!', admin: { id: result.insertId, username, role } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username already exists.' });
        }
        console.error('Error adding admin:', err);
        res.status(500).json({ message: 'Error adding admin', error: err.message });
    }
});

// DELETE an admin (Protected: Requires 'admin' role)
app.delete('/api/admins/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent admin from deleting themselves (optional security check)
        if (parseInt(id) === req.admin.id) {
             return res.status(403).json({ message: 'Cannot delete your own account while logged in.' });
        }

        const [result] = await pool.query('DELETE FROM admins WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        res.json({ message: 'Admin deleted successfully!' });
    } catch (err) {
        console.error('Error deleting admin:', err);
        res.status(500).json({ message: 'Error deleting admin', error: err.message });
    }
});


// --------------------------------------------------
// --- API Endpoints for Products (Protected) ---
// --------------------------------------------------

// GET all products
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products');
        // Prepend base URL to image paths for frontend consumption
        const productsWithImageUrls = rows.map(product => ({
            ...product,
            imageUrl: product.imageUrl ? `http://localhost:${PORT}/uploads/${path.basename(product.imageUrl)}` : null
        }));
        res.json(productsWithImageUrls);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

// POST a new product with image upload (Protected: Requires 'admin' role)
app.post('/api/products', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
    try {
        const {
            medicineId, supplierName, medicineName, genericName,
            brandName, category, description, form, strength,
            unit, reorderLevel, price, quantity, deliveryDate, barcode
        } = req.body;

        if (!medicineId || !supplierName || !genericName || !brandName || !category || !price || !quantity || !deliveryDate || !barcode) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        const imageUrl = req.file ? req.file.path : null; // Path where the image is saved on the server

        const [result] = await pool.query(
            `INSERT INTO products (medicineId, supplierName, medicineName, genericName, brandName, category, description, form, strength, unit, reorderLevel, price, quantity, deliveryDate, imageUrl, barcode)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                medicineId, supplierName, medicineName, genericName,
                brandName, category, description, form, strength,
                unit, reorderLevel, price, quantity, deliveryDate, imageUrl, barcode
            ]
        );

        const newProduct = {
            id: result.insertId,
            medicineId, supplierName, medicineName, genericName,
            brandName, category, description, form, strength,
            unit, reorderLevel, price, quantity, deliveryDate,
            imageUrl: imageUrl ? `http://localhost:${PORT}/uploads/${path.basename(imageUrl)}` : null,
            barcode
        };

        res.status(201).json({ message: 'Product added successfully!', product: newProduct });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A product with this Medicine ID or Barcode already exists.', error: err.message });
        }
        console.error('Error adding product:', err);
        res.status(500).json({ message: 'Error adding product', error: err.message });
    }
});

// PUT (Update) an existing product with optional image upload (Protected: Requires 'admin' role)
app.put('/api/products/:id', authenticateToken, authorizeRole('admin'), upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            medicineId, supplierName, medicineName, genericName,
            brandName, category, description, form, strength,
            unit, reorderLevel, price, quantity, deliveryDate, barcode
        } = req.body;

        if (!medicineId || !supplierName || !genericName || !brandName || !category || !price || !quantity || !deliveryDate || !barcode) {
            return res.status(400).json({ message: 'Please provide all required fields.' });
        }

        let imageUrl = req.file ? req.file.path : null;

        // Fetch current product to handle image deletion if a new one is uploaded
        const [currentProducts] = await pool.query('SELECT imageUrl FROM products WHERE id = ?', [id]);
        const currentProduct = currentProducts[0];

        if (req.file && currentProduct && currentProduct.imageUrl) {
            // Delete old image if a new one is uploaded
            const oldImagePath = path.join(uploadsDir, path.basename(currentProduct.imageUrl));
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
                console.log(`Deleted old image: ${oldImagePath}`);
            }
        } else if (!req.file && currentProduct && currentProduct.imageUrl) {
            // If no new file and previous image exists, retain the old image URL
            imageUrl = currentProduct.imageUrl;
        }

        const [result] = await pool.query(
            `UPDATE products SET
                medicineId = ?, supplierName = ?, medicineName = ?, genericName = ?,
                brandName = ?, category = ?, description = ?, form = ?, strength = ?,
                unit = ?, reorderLevel = ?, price = ?, quantity = ?, deliveryDate = ?,
                imageUrl = ?, barcode = ?
             WHERE id = ?`,
            [
                medicineId, supplierName, medicineName, genericName,
                brandName, category, description, form, strength,
                unit, reorderLevel, price, quantity, deliveryDate, imageUrl, barcode, id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        const updatedProduct = {
            id: parseInt(id),
            medicineId, supplierName, medicineName, genericName,
            brandName, category, description, form, strength,
            unit, reorderLevel, price, quantity, deliveryDate,
            imageUrl: imageUrl ? `http://localhost:${PORT}/uploads/${path.basename(imageUrl)}` : null,
            barcode
        };

        res.json({ message: 'Product updated successfully!', product: updatedProduct });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A product with this Medicine ID or Barcode already exists.', error: err.message });
        }
        console.error('Error updating product:', err);
        res.status(500).json({ message: 'Error updating product', error: err.message });
    }
});

// DELETE a product (Protected: Requires 'admin' role)
app.delete('/api/products/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch product to delete its image file
        const [products] = await pool.query('SELECT imageUrl FROM products WHERE id = ?', [id]);
        const product = products[0];

        if (product && product.imageUrl) {
            const imagePath = path.join(uploadsDir, path.basename(product.imageUrl));
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`Deleted image file: ${imagePath}`);
            }
        }

        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not found.' });
        }
        res.json({ message: 'Product deleted successfully!' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ message: 'Error deleting product', error: err.message });
    }
});


// --------------------------------------------------
// --- API Endpoints for Categories (Protected) ---
// --------------------------------------------------

// GET all categories
app.get('/api/categories', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ message: 'Error fetching categories', error: err.message });
    }
});

// POST a new category (Protected: Requires 'admin' role)
app.post('/api/categories', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required.' });
        }
        const [result] = await pool.query('INSERT INTO categories (name) VALUES (?)', [name]);
        res.status(201).json({ message: 'Category added successfully!', category: { id: result.insertId, name } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Category already exists.' });
        }
        console.error('Error adding category:', err);
        res.status(500).json({ message: 'Error adding category', error: err.message });
    }
});

// PUT (Update) a category (Protected: Requires 'admin' role)
app.put('/api/categories/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Category name is required.' });
        }

        const [result] = await pool.query('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        res.json({ message: 'Category updated successfully!', category: { id: parseInt(id), name } });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Category name already exists.' });
        }
        console.error('Error updating category:', err);
        res.status(500).json({ message: 'Error updating category', error: err.message });
    }
});

// DELETE a category (Protected: Requires 'admin' role)
app.delete('/api/categories/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Check if any products are associated with this category
        const [productsCount] = await pool.query('SELECT COUNT(*) AS count FROM products WHERE category = (SELECT name FROM categories WHERE id = ?)', [id]);
        if (productsCount[0].count > 0) {
            return res.status(400).json({ message: 'Cannot delete category as products are still assigned to it.' });
        }

        const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }
        res.json({ message: 'Category deleted successfully!' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ message: 'Error deleting category', error: err.message });
    }
});


// --------------------------------------------------
// --- API Endpoints for Receipts/Orders (Protected) ---
// --------------------------------------------------

// POST a new receipt (Protected: Requires any authenticated admin)
app.post('/api/receipts', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection(); // Get a connection from the pool
    try {
        await connection.beginTransaction(); // Start a transaction

        const {
            customerName, customerAddress, customerTin,
            totalPrice, discountPercent, discountAmount,
            netPay, cashGiven, changeAmount, paymentMethod,
            vatableSale, vatAmount, transaction_date, cart
        } = req.body;

        // 1. Insert into receipts table
        const [receiptResult] = await connection.query(
            `INSERT INTO receipts (
                customer_name, customer_address, customer_tin,
                total_price, discount_percent, discount_amount,
                net_pay, cash_given, change_amount, payment_method,
                vatable_sale, vat_amount, transaction_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerName, customerAddress, customerTin,
                totalPrice, discountPercent, discountAmount,
                netPay, cashGiven, changeAmount, paymentMethod,
                vatableSale, vatAmount, transaction_date
            ]
        );

        const receiptId = receiptResult.insertId;

        // 2. Insert into receipt_items table for each item in the cart
        for (const item of cart) {
            await connection.query(
                `INSERT INTO receipt_items (
                    receipt_id, product_id, product_name, quantity, price
                ) VALUES (?, ?, ?, ?, ?)`,
                [receiptId, item.id, item.name, item.quantity, item.price]
            );

            // Optionally, update product quantity in the products table
            await connection.query(
                'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                [item.quantity, item.id]
            );
        }

        await connection.commit(); // Commit the transaction
        res.status(201).json({ message: 'Receipt saved successfully!', receiptId: receiptId });

    } catch (err) {
        await connection.rollback(); // Rollback the transaction in case of error
        console.error('Error saving receipt:', err);
        res.status(500).json({ message: 'Error saving receipt', error: err.message });
    } finally {
        connection.release(); // Release the connection back to the pool
    }
});

// GET all receipts with their items (Protected: Requires any authenticated admin)
app.get('/api/receipts', authenticateToken, async (req, res) => {
    try {
        // Fetch all receipts
        const [receipts] = await pool.query('SELECT * FROM receipts ORDER BY transaction_date DESC');

        // For each receipt, fetch its associated items
        const receiptsWithItems = await Promise.all(receipts.map(async (receipt) => {
            const [items] = await pool.query('SELECT product_id, product_name, quantity, price FROM receipt_items WHERE receipt_id = ?', [receipt.id]);
            return {
                ...receipt,
                cart: items
            };
        }));

        res.json(receiptsWithItems);
    } catch (err) {
        console.error('Error fetching receipts:', err);
        res.status(500).json({ message: 'Error fetching receipts', error: err.message });
    }
});

// GET a single receipt by ID with its items (Protected: Requires any authenticated admin)
app.get('/api/receipts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the receipt
        const [receipts] = await pool.query('SELECT * FROM receipts WHERE id = ?', [id]);
        if (receipts.length === 0) {
            return res.status(404).json({ message: 'Receipt not found.' });
        }
        const receipt = receipts[0];

        // Fetch associated items
        const [items] = await pool.query('SELECT product_id, product_name, quantity, price FROM receipt_items WHERE receipt_id = ?', [id]);

        res.json({ ...receipt, cart: items });
    } catch (err) {
        console.error('Error fetching single receipt:', err);
        res.status(500).json({ message: 'Error fetching receipt', error: err.message });
    }
});

// DELETE a receipt and its associated items (Protected: Requires 'admin' role)
app.delete('/api/receipts/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
    const connection = await pool.getConnection(); // Get a connection from the pool
    try {
        await connection.beginTransaction(); // Start a transaction

        const { id } = req.params;

        // 1. Delete associated receipt items first
        const [itemsResult] = await connection.query('DELETE FROM receipt_items WHERE receipt_id = ?', [id]);
        console.log(`Deleted ${itemsResult.affectedRows} items for receipt ID ${id}`);

        // 2. Delete the receipt itself
        const [receiptResult] = await connection.query('DELETE FROM receipts WHERE id = ?', [id]);

        if (receiptResult.affectedRows === 0) {
            await connection.rollback(); // Rollback if receipt not found
            return res.status(404).json({ message: 'Receipt not found.' });
        }

        await connection.commit(); // Commit the transaction
        res.json({ message: 'Receipt deleted successfully!' });

    } catch (err) {
        await connection.rollback(); // Rollback the transaction in case of error
        console.error('Error deleting receipt:', err);
        res.status(500).json({ message: 'Error deleting receipt', error: err.message });
    } finally {
        connection.release(); // Release the connection back to the pool
    }
});

// API Endpoint for Sales Report (Protected: Requires any authenticated admin)
app.get('/api/sales-report', authenticateToken, async (req, res) => {
    try {
        // This query aggregates sales data from receipts and their items
        const [salesData] = await pool.query(`
            SELECT
                r.transaction_date,
                ri.product_name,
                ri.quantity AS quantity_sold,
                ri.price AS item_price,
                (ri.quantity * ri.price) AS total_item_sale,
                r.customer_name,
                r.payment_method,
                r.total_price AS receipt_total_price,
                r.discount_amount,
                r.net_pay,
                r.vat_amount
            FROM
                receipts r
            JOIN
                receipt_items ri ON r.id = ri.receipt_id
            ORDER BY
                r.transaction_date DESC, ri.product_name ASC
        `);
        res.json(salesData);
    } catch (err) {
        console.error('Error fetching sales report:', err);
        res.status(500).json({ message: 'Error fetching sales report', error: err.message });
    }
});


// --------------------------------------------------
// --- INITIALIZATION ---
// --------------------------------------------------

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
