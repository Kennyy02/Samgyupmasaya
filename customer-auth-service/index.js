// customer-auth-service/index.js

// ... (Code before the analytics route)

// Daily User Registration Analytics
app.get("/analytics/users-daily", async (_req, res) => {
  try {
    // 🚨 CRITICAL FIX: The entire query string is retyped/cleaned to remove invisible non-breaking spaces
    const [rows] = await db.execute(`
SELECT DATE(created_at) AS date, COUNT(id) AS count
FROM customers
GROUP BY DATE(created_at)
ORDER BY date ASC
LIMIT 30
`);
    res.json(rows);
  } catch (err) {
    // Keeping the strong error reporting for safety
    console.error("❌ CRITICAL DB ERROR fetching daily user registrations:", err);
    
    res.status(500).json({ 
        error: "Failed to fetch daily user registrations.",
        detail: "Internal server error. Check the Customer Auth Service logs for database details."
    });
  }
});

// ... (Code after the analytics route)
