const express = require("express");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const solverRoutes = require("./routes/solverRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Authentication Endpoints
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const username = email.split("@")[0];
  res.json({
    token: "mock-jwt-token-" + Date.now(),
    user: { email, username }
  });
});

app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  res.json({
    token: "mock-jwt-token-" + Date.now(),
    user: { email, username: username || email.split("@")[0] }
  });
});

// Plate Solver API Routes
app.use("/api/solver", solverRoutes);

// Flexible Catalog Search Endpoint
app.get("/api/astro/catalog/search", (req, res) => {
  const query = (req.query.query || "").trim().toLowerCase();
  
  const catalog = [
    { catalog_id: "M42", object_name: "Orion Nebula", ra: 83.8221, dec: -5.2333, type: "Emission Nebula" },
    { catalog_id: "M31", object_name: "Andromeda Galaxy", ra: 10.6847, dec: 41.2687, type: "Spiral Galaxy" },
    { catalog_id: "M13", object_name: "Hercules Cluster", ra: 250.4218, dec: 36.4603, type: "Globular Cluster" },
    { catalog_id: "M57", object_name: "Ring Nebula", ra: 283.3962, dec: 33.0292, type: "Planetary Nebula" },
    { catalog_id: "M45", object_name: "Pleiades", ra: 56.8700, dec: 24.1050, type: "Open Cluster" },
    { catalog_id: "NGC 1976", object_name: "Great Orion Nebula", ra: 83.8221, dec: -5.2333, type: "H II Region" }
  ];

  if (!query) {
    return res.json([]);
  }

  const filtered = catalog.filter(
    item => item.catalog_id.toLowerCase().includes(query) || item.object_name.toLowerCase().includes(query)
  );

  res.json(filtered);
});

// Fallback SPA Route (Express 5 syntax)
app.get("/*path", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`[ASTROMAPS] Server & Auth Portal live on http://localhost:${PORT}`);
});
