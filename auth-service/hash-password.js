const mysql = require('mysql2');
const bcrypt = require('bcrypt');

// Hardcoded credentials
const username = 'admin';
const password = 'admin123';

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '12345', // your MySQL root password
  database: 'auth_db',
  port: 3306
});

db.connect(async (err) => {
  if (err) {
    console.error('DB Connection failed:', err);
    return;
  }

  console.log('Connected to MySQL');

  const hash = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO admins (username, password_hash) VALUES (?, ?)';
  db.query(query, [username, hash], (err, result) => {
    if (err) {
      console.error('Error inserting admin:', err.message);
    } else {
      console.log('Admin inserted successfully!');
    }
    db.end();
  });
});