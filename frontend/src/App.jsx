import React, { useState } from "react";
import axios from "axios";
import ResultDisplay from "./components/ResultDisplay";

// Use Vite's env variable
const API_URL_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:4000";
const API_URL = `${API_URL_BASE.replace(/\/$/, "")}/api/documents`;

export default function App() {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // State to hold all outputs and temporary context
  const [results, setResults] = useState({
    structuredDataExtracted: null,
    fullDocumentText: null,
    userQuery: null,
    analyticalAnswer: null,
    generatedEmailBody: null,
    automationStatus: null,
    message: null,
    error: null,
  });

  const resetResults = () => {
    setResults({
      structuredDataExtracted: null,
      fullDocumentText: null,
      userQuery: null,
      analyticalAnswer: null,
      generatedEmailBody: null,
      automationStatus: null,
      message: null,
      error: null,
    });
  };

  // --- Step 1: Document Upload & Extraction ---
  const handleExtraction = async (e) => {
    e.preventDefault();
    setLoading(true);
    resetResults();

    if (!file) {
      setResults((p) => ({ ...p, error: "Please select a file to upload." }));
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("query", query);

    try {
      const response = await axios.post(`${API_URL}/extract`, formData, {
        // Let axios set multipart boundaries automatically
        headers: { Accept: "application/json" },
        timeout: 60000,
      });

      // Successful HTTP status (200)
      if (response.status === 200 && !response.data.error) {
        // If AI returned raw text (non-JSON), backend may return ai_raw — handle gracefully
        if (response.data.ai_raw) {
          setResults((prev) => ({
            ...prev,
            error: "AI returned non-JSON output. See server response.",
            message: response.data.message || null,
            // include ai raw for debugging if present
            analyticalAnswer: response.data.ai_raw,
          }));
          setLoading(false);
          return;
        }

        setResults((prev) => ({
          ...prev,
          structuredDataExtracted: response.data.extractedData || null,
          fullDocumentText: response.data.fullDocumentText || null,
          userQuery: response.data.userQuery || query,
          message: response.data.message || "Extraction completed.",
        }));

        setStep(2);
      } else {
        setResults((p) => ({
          ...p,
          error: response.data.error || "Extraction failed.",
        }));
      }
    } catch (error) {
      console.error(
        "Extraction Failed:",
        error.response?.data || error.message
      );
      setResults((p) => ({
        ...p,
        error:
          error.response?.data?.error ||
          error.message ||
          "Failed to connect to backend or process document.",
      }));
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Trigger Conditional Email Automation (n8n) ---
  const handleSendAlert = async () => {
    setLoading(true);
    setResults((p) => ({
      ...p,
      error: null,
      analyticalAnswer: null,
      generatedEmailBody: null,
      automationStatus: "Triggering workflow...",
    }));

    if (!recipientEmail) {
      setResults((p) => ({ ...p, error: "Recipient email is required." }));
      setLoading(false);
      return;
    }

    const payload = {
      fullDocumentText: results.fullDocumentText,
      extractedData: results.structuredDataExtracted,
      userQuery: results.userQuery,
      recipientEmail: recipientEmail,
    };

    try {
      const response = await axios.post(`${API_URL}/send-alert`, payload, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      });

      if (response.status === 200 && !response.data.error) {
        setResults((prev) => ({
          ...prev,
          analyticalAnswer: response.data.analyticalAnswer || null,
          generatedEmailBody: response.data.generatedEmailBody || null,
          automationStatus: response.data.automationStatus || "unknown",
          message: response.data.message || "n8n workflow invoked.",
        }));
      } else {
        setResults((p) => ({
          ...p,
          error: response.data.error || "Automation failed.",
        }));
      }
    } catch (error) {
      console.error(
        "Alert Mail Failed:",
        error.response?.data || error.message
      );
      setResults((p) => ({
        ...p,
        error:
          error.response?.data?.error ||
          error.message ||
          "Failed to trigger n8n workflow.",
        automationStatus: "Failed to Trigger",
      }));
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setQuery("");
    setRecipientEmail("");
    setStep(1);
    resetResults();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10 p-6 bg-white rounded-xl shadow-lg border-t-4 border-indigo-600">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-800 tracking-tight">
            🤖 AI-Powered Document Orchestrator
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Dynamic Extraction and Conditional Business Process Automation.
          </p>
        </header>

        {/* Status Messages */}
        {results.error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 font-medium shadow-md"
            role="alert"
          >
            ⚠️ Error: {results.error}
          </div>
        )}
        {results.message && !results.error && (
          <div
            className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6 font-medium shadow-md"
            role="alert"
          >
            ✅ Success: {results.message}
          </div>
        )}

        {/* Control Panel (Steps 1 & 2) */}
        <div className="p-6 sm:p-8 bg-white shadow-2xl rounded-xl">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Execution Flow
          </h3>

          {/* Step 1: Document Upload & Extraction */}
          <div
            className={`p-6 rounded-xl transition-all duration-300 border-2 ${
              step === 1
                ? "bg-indigo-50 border-indigo-400 shadow-lg"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <h4 className="text-xl font-semibold mb-4 text-gray-700">
              1. Upload Document & Extract Data (Gemini)
            </h4>
            <form onSubmit={handleExtraction} className="space-y-4">
              <input
                type="file"
                required
                onChange={(e) => {
                  setFile(e.target.files[0]);
                  setStep(1);
                  resetResults();
                }}
                accept=".pdf,.txt"
                className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer transition-colors"
              />
              <textarea
                placeholder="Enter custom analytical question (e.g., What is the total outstanding balance or who must sign this contract?)"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows="3"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm resize-none"
              />
              <button
                type="submit"
                disabled={loading || step === 2}
                className={`w-full py-3 rounded-xl text-white font-bold transition duration-300 shadow-md ${
                  loading && step === 1
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {loading && step === 1
                  ? "Processing & Extracting..."
                  : "Run Structured AI Extraction"}
              </button>
            </form>
          </div>

          {/* Step 2: Conditional Email Automation */}
          {results.structuredDataExtracted && (
            <div
              className={`mt-6 p-6 rounded-xl transition-all duration-300 border-2 ${
                step === 2
                  ? "bg-green-50 border-green-400 shadow-lg"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <h4 className="text-xl font-semibold mb-4 text-gray-700">
                2. Trigger Conditional Email Automation (n8n)
              </h4>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Recipient Email ID for Alert"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition shadow-sm"
                />
                <button
                  onClick={handleSendAlert}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-white font-bold transition duration-300 shadow-md ${
                    loading
                      ? "bg-green-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {loading
                    ? "Executing n8n Workflow..."
                    : "Send Alert Mail via n8n"}
                </button>
                <button
                  onClick={resetApp}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 transition duration-150 shadow-sm"
                >
                  Reset Application
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Display Output */}
        <ResultDisplay results={results} />
      </div>
    </div>
  );
}
