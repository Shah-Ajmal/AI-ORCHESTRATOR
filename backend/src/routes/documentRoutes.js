// backend/src/routes/documentRoutes.js
const express = require("express");
const multer = require("multer");
const {
  processDocument,
  sendAlertMail,
} = require("../controllers/documentController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB limit

// Route 1: Upload and Extract (Handles file upload)
router.post("/extract", upload.single("file"), processDocument);

// Route 2: Trigger Conditional Email (Sends context to n8n)
router.post("/send-alert", express.json(), sendAlertMail);

module.exports = router;
