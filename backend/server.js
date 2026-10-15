const express = require("express");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = require("./config/db");
const solverRoutes = require("./routes/solverRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Authentication: Register with validation rules
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  // 1. Username rule: No underscores allowed
  if (username.includes('_')) {
    return res.status(400).json({ error: "Usernames cannot contain underscores (_)." });
  }

  // 2. Password rules: > 5 chars, 1 capital letter, 1 special character
  if (password.length <= 5) {
    return res.status(400).json({ error: "Password must be more than 5 characters long." });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one capital letter." });
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return res.status(400).json({ error: "Password must contain at least one unique/special character." });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, is_admin`,
      [username, email, password_hash]
    );

    res.status(201).json({
      token: "mock-jwt-token-" + Date.now(),
      user: newUser.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: "User already exists or database error: " + err.message });
  }
});

// Authentication: Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    res.json({
      token: "mock-jwt-token-" + Date.now(),
      user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Route: View All Users
app.get("/api/admin/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Plate Solver API Routes
app.use("/api/solver", solverRoutes);

// Catalog Search Endpoint
app.get("/api/astro/catalog/search", async (req, res) => {
  const query = (req.query.query || "").trim();
  try {
    const result = await pool.query(
      `SELECT catalog_id, object_name, ra, dec, type FROM celestial_objects WHERE LOWER(object_name) LIKE LOWER($1) OR LOWER(catalog_id) LIKE LOWER($1)`,
      [`%${query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback SPA Route
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`[ASTROMAPS] Server & Auth Portal live on http://localhost:${PORT}`);
});
