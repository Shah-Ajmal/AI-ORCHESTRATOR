// backend/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const documentRoutes = require("../src/routes/documentRoutes.js");

const app = express();
const PORT = process.env.PORT || 4000;

// Configure CORS safely — adjust origin to your frontend URL in production
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*", // set to your domain in production
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/documents", documentRoutes);
app.get("/", (req, res) => {
  res.send("Welcome to the AI Orchestrator API!");
});

// Basic health-check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
