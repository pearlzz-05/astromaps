const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { solveImage } = require("../../plate-solver-service/plate_solver_service");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Authentication middleware check
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Please register or log in to use the plate solver." });
  }
  next();
};

router.post("/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file uploaded." });
  }

  try {
    const result = solveImage(req.file.path);
    res.json(result);
  } catch (err) {
    console.error("Plate solver error:", err);
    res.status(500).json({ error: "Plate solving failed." });
  }
});

module.exports = router;