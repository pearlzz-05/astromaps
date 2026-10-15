const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();~

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*', // Allows requests from index.html during development
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
// Test Database Connection on Launch
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error connecting to PostgreSQL:', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database:', process.env.DB_NAME);
  release();
});

// ==========================================
// 1. REGISTER USER ENDPOINTn
// ==========================================
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields (username, email, password) are required.' });
  }

  try {
    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      `INSERT INTO users (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING userid, username, email`,
      [username, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Account created successfully!',
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error('Registration Error:', err.message);
    if (err.code === '23505') { // Unique constraint violation in Postgres
      return res.status(400).json({ error: 'Username or Email already exists.' });
    }
    res.status(500).json({ error: 'Database error during registration.' });
  }
});

// ==========================================
// 2. LOGIN USER ENDPOINT
// ==========================================
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please enter both username and password.' });
  }

  try {
    // Search user by username
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const user = userResult.rows[0];

    // Compare hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Success - return user session payload
    res.json({
      userid: user.userid,
      username: user.username,
      email: user.email,
      message: 'Authentication successful'
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Server authentication failed.' });
  }
});

// ==========================================
// 3. FETCH CELESTIAL CATALOG ENDPOINT
// ==========================================
app.get('/api/celestial-log', async (req, res) => {
  try {
    const catalogData = await pool.query(
      `SELECT 
        objectid AS id, 
        catalog_id AS identifier, 
        common_name, 
        objecttype AS type,
        ra,
        dec
       FROM celestial_log 
       ORDER BY catalog_id ASC`
    );
    res.json(catalogData.rows);
  } catch (err) {
    console.error('Catalog Fetch Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve celestial log.' });
  }
});

// ==========================================
// 4. SAVE UPLOADED ASTROPHOTOGRAPHY & CLASSIFICATION
// ==========================================
app.post('/api/photos/upload', async (req, res) => {
  const { userId, storageUrl, objectId } = req.body;

  if (!userId || !storageUrl) {
    return res.status(400).json({ error: 'User ID and photo URL are required.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    // 1. Insert into userphotos
    const photoResult = await client.query(
      `INSERT INTO userphotos (userid, strorage_url, uploadedat) 
       VALUES ($1, $2, NOW()) 
       RETURNING photoid`,
      [userId, storageUrl]
    );

    const newPhotoId = photoResult.rows[0].photoid;

    // 2. Insert into photoclassifications if matched objectId exists
    if (objectId) {
      await client.query(
        `INSERT INTO photoclassifications (photoid, objectid) 
         VALUES ($1, $2)`,
        [newPhotoId, objectId]
      );
    }

    await client.query('COMMIT'); // Commit transaction

    res.status(201).json({
      message: 'Photo record and classification logged successfully.',
      photoId: newPhotoId
    });
  } catch (err) {
    await client.query('ROLLBACK'); // Roll back on failure
    console.error('Photo Save Error:', err.message);
    res.status(500).json({ error: 'Transaction failed while saving photo data.' });
  } finally {
    client.release();
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Astromaps Server running on http://localhost:${PORT}`);
});