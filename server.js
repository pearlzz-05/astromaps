const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL Connection Pool
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'astromaps',
  password: 'your_db_password',
  port: 5432,
});

// 1. REGISTER USER
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING userid, username, email',
      [username, email, hashedPassword]
    );
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: 'Username or Email already exists' });
  }
});

// 2. LOGIN USER
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ userid: user.userid, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 3. FETCH CELESTIAL LOG (CATALOG)
app.get('/api/celestial-log', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM celestial_log ORDER BY catalog_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// 4. LOG USER PHOTO & CLASSIFICATION
app.post('/api/photos/upload', async (req, res) => {
  const { userId, storageUrl, objectId } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insert Photo record
    const photoRes = await client.query(
      'INSERT INTO userphotos (userid, strorage_url, uploadedat) VALUES ($1, $2, NOW()) RETURNING photoid',
      [userId, storageUrl]
    );
    const photoId = photoRes.rows[0].photoid;

    // Link Photo to Celestial Object Classification
    if (objectId) {
      await client.query(
        'INSERT INTO photoclassifications (photoid, objectid) VALUES ($1, $2)',
        [photoId, objectId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Photo and classification saved successfully', photoId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to save photo record' });
  } finally {
    client.release();
  }
});

app.listen(5000, () => console.log('Astromaps API running on port 5000'));