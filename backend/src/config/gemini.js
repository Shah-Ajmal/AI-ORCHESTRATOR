// CommonJS version — initialize and export the AI client
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not set in .env. Please set GEMINI_API_KEY."
  );
}

// Initialize the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey });

module.exports = ai;
