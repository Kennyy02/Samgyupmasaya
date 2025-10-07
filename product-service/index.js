// product-service/index.js
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;

const app = express();

// ✅ CORS: Allow frontend on Railway + localhost for dev
app.use(
  cors({
    origin: [
      "https://samgyupmasaya-frontend.up.railway.app", // your deployed frontend
      "http://localhost:3000", // for local testing
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// ----------------------------------------------------------------------
// ✅ Multer Configuration
// ----------------------------------------------------------------------
const uploadDir = path.join(__dirname, "uploads");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      console.error("❌ Failed to create uploads directory:", err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });
app.use("/uploads", express.static(uploadDir));

// ----------------------------------------------------------------------
// ✅ DATABASE CONFIGURATION: USE RAILWAY ENVIRONMENT VARIABLE
// ----------------------------------------------------------------------
const dbUrl = process.env.MYSQL_URL;

if (!dbUrl) {
  console.error("❌ FATAL ERROR: MYSQL_URL not set. Exiting Product Service.");
  process.exit(1);
}

const db = mysql.createPool(dbUrl);

db.getConnection()
  .then((conn) => {
    console.log("✅ Product Service: Connected to MySQL (using MYSQL_URL)");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Product Service DB Connection Error:", err.message);
    process.exit(1);
  });

// ----------------------------------------------------------------------
// ✅ Helper Functions
// ----------------------------------------------------------------------
async function getCategoryId(categoryName) {
  if (!categoryName) return null;

  const [existing] = await db.execute("SELECT id FROM categories WHERE name = ?", [
    categoryName,
  ]);

  if (existing.length > 0) return existing[0].id;

  const [result] = await db.execute("INSERT INTO categories (name) VALUES (?)", [
    categoryName,
  ]);
  return result.insertId;
}

async function handleImageUpdate(table, productId, newFile) {
  if (!newFile) return null;
  const imageUrl = `/uploads/${newFile.filename}`;

  try {
    const [existing] = await db.execute(`SELECT image_url FROM ${table} WHERE id = ?`, [
      productId,
    ]);

    if (existing.length && existing[0].image_url) {
      const oldPath = path.join(__dirname, existing[0].image_url);
      await fs.unlink(oldPath).catch((err) =>
        console.warn("⚠️ Could not delete old image:", err.message)
      );
    }
  } catch (err) {
    console.error("Error cleaning old image:", err);
  }
  return imageUrl;
}

// ----------------------------------------------------------------------
// ✅ Categories Endpoint
// ----------------------------------------------------------------------
app.get("/categories", async (_req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM categories");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------------------
// ✅ Product Analytics
// ----------------------------------------------------------------------
app.get("/analytics/product-counts", async (_req, res) => {
  try {
    const [onlineRows] = await db.execute("SELECT COUNT(*) AS count FROM products_online");
    const [onsiteRows] = await db.execute("SELECT COUNT(*) AS count FROM products_onsite");

    res.json({
      onlineItems: onlineRows[0].count,
      onsiteItems: onsiteRows[0].count,
    });
  } catch (err) {
    console.error("Error fetching product counts:", err);
    res.status(500).json({ error: "Failed to fetch product counts" });
  }
});

// ----------------------------------------------------------------------
// ✅ Product Search
// ----------------------------------------------------------------------
app.get("/products/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Missing search query 'q'." });

  const searchTerm = `%${query}%`;
  try {
    const [online] = await db.execute(
      "SELECT *, 'online' AS type FROM products_online WHERE name LIKE ?",
      [searchTerm]
    );
    const [onsite] = await db.execute(
      "SELECT *, 'onsite' AS type FROM products_onsite WHERE name LIKE ?",
      [searchTerm]
    );

    res.json([...online, ...onsite]);
  } catch (err) {
    console.error("Error searching products:", err);
    res.status(500).json({ error: "Failed to search products" });
  }
});

// ----------------------------------------------------------------------
// ✅ Product Routes Factory
// ----------------------------------------------------------------------
function registerProductRoutes(routePath, tableName) {
  // Get all products
  app.get(routePath, async (_req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, c.name AS category_name
         FROM ${tableName} p
         LEFT JOIN categories c ON p.category_id = c.id
         ORDER BY p.created_at DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get product by ID
  app.get(`${routePath}/:id`, async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT p.*, c.name AS category_name
         FROM ${tableName} p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.id = ?`,
        [req.params.id]
      );
      if (rows.length === 0)
        return res.status(404).json({ message: "Product not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Add new product
  app.post(routePath, upload.single("image"), async (req, res) => {
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const { category_name, name, stock, price, description } = req.body;

    try {
      const category_id = await getCategoryId(category_name);
      await db.execute(
        `INSERT INTO ${tableName}
         (image_url, category_id, name, stock, price, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [image_url, category_id, name, stock, price, description]
      );
      res.json({ message: `${tableName} product added` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update product
  app.put(`${routePath}/:id`, upload.single("image"), async (req, res) => {
    const productId = req.params.id;
    const { category_name, name, stock, price, description } = req.body;

    try {
      const fields = [];
      const values = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }
      if (stock !== undefined) {
        fields.push("stock = ?");
        values.push(stock);
      }
      if (price !== undefined) {
        fields.push("price = ?");
        values.push(price);
      }
      if (category_name !== undefined) {
        const category_id = await getCategoryId(category_name);
        fields.push("category_id = ?");
        values.push(category_id ?? null);
      }
      if (description !== undefined) {
        fields.push("description = ?");
        values.push(description ?? null);
      }

      const image_url = await handleImageUpdate(tableName, productId, req.file);
      if (image_url) {
        fields.push("image_url = ?");
        values.push(image_url);
      }

      if (fields.length === 0)
        return res.status(400).json({ message: "No fields to update." });

      const query = `UPDATE ${tableName} SET ${fields.join(", ")} WHERE id = ?`;
      values.push(productId);

      const [result] = await db.execute(query, values);
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Product not found" });

      res.json({ message: `${tableName} product updated` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Patch stock
  app.patch(`${routePath}/:id`, async (req, res) => {
    const productId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0)
      return res.status(400).json({ message: "Invalid quantity provided." });

    try {
      const [current] = await db.execute(
        `SELECT stock FROM ${tableName} WHERE id = ?`,
        [productId]
      );
      if (current.length === 0)
        return res.status(404).json({ message: "Product not found." });

      const newStock = current[0].stock - quantity;
      if (newStock < 0)
        return res.status(400).json({ message: "Not enough stock available." });

      await db.execute(`UPDATE ${tableName} SET stock = ? WHERE id = ?`, [
        newStock,
        productId,
      ]);

      res.json({ message: `Stock updated successfully. New stock: ${newStock}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete product
  app.delete(`${routePath}/:id`, async (req, res) => {
    try {
      const [product] = await db.execute(
        `SELECT image_url FROM ${tableName} WHERE id = ?`,
        [req.params.id]
      );

      if (product.length && product[0].image_url) {
        const oldPath = path.join(__dirname, product[0].image_url);
        await fs.unlink(oldPath).catch((err) =>
          console.warn("Could not delete product image:", err.message)
        );
      }

      await db.execute(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
      res.json({ message: `${tableName} product deleted` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ----------------------------------------------------------------------
// ✅ Register Online & Onsite Product Routes
// ----------------------------------------------------------------------
registerProductRoutes("/products/online", "products_online");
registerProductRoutes("/products/onsite", "products_onsite");

// ----------------------------------------------------------------------
// ✅ Start Server
// ----------------------------------------------------------------------
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`🚀 Product Service running on port ${PORT}`));
