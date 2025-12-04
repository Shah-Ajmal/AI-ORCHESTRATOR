// Main extraction and n8n trigger controller
const ai = require("../config/gemini");
const parseFile = require("../utils/fileParser");
const axios = require("axios");

// A JSON Schema describing the expected structured extraction.

const extractionSchema = {
  type: "object",
  properties: {
    documentType: {
      type: "string",
      description:
        "The type of document (e.g., Invoice, Contract, Meeting Notes,Resume).",
    },
    queryContext: {
      type: "string",
      description: "A one-sentence summary of the user's question.",
    },
    keyMetrics: {
      type: "array",
      description:
        "A list of 5-8 most relevant key-value pairs from the document that answer the user's query.",
      items: {
        type: "object",
        properties: {
          key: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
  required: ["documentType", "queryContext", "keyMetrics"],
};

// Returns the raw string response that should be valid JSON (per your prompt/config).
async function callAIForExtraction({
  prompt,
  modelName = "gemini-2.5-flash",
  schema,
}) {
  try {
    if (ai && ai.models && typeof ai.models.generateContent === "function") {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      // response.text or response.output may vary
      if (typeof response.text === "string") return response.text;
      if (typeof response.text === "function") return await response.text();
      if (
        response.output &&
        response.output.length &&
        response.output[0].content
      ) {
        // try to locate text inside content
        const found = response.output[0].content.find(
          (c) => c.type === "output_text"
        );
        if (found) return found.text || found;
      }
      // fallback: stringify whole object
      return JSON.stringify(response);
    }

    // Pattern B: ai.getGenerativeModel -> model.generateContent([...])
    if (ai && typeof ai.getGenerativeModel === "function") {
      const model = ai.getGenerativeModel({
        model: modelName,
        responseSchema: schema,
        responseMimeType: "application/json",
      });

      // SDKs differ on input shapes; many accept an array of messages
      const response = await model.generateContent([
        { role: "user", parts: [{ text: prompt }] },
      ]);

      // response.text() or response.text
      if (typeof response.text === "function") {
        return await response.text();
      }
      if (typeof response.text === "string") {
        return response.text;
      }
      // Some versions return an object containing 'output' or 'candidates'
      if (
        response.output &&
        response.output.length &&
        response.output[0].content
      ) {
        const candidate = response.output[0].content.find(
          (c) => c.type === "output_text"
        );
        if (candidate) return candidate.text;
      }
      // fallback
      return JSON.stringify(response);
    }

    // Pattern C: ai.generate (generic)
    if (ai && typeof ai.generate === "function") {
      const response = await ai.generate({
        model: modelName,
        prompt,
        responseSchema: schema,
        responseMimeType: "application/json",
      });

      if (response && response.output && response.output_text)
        return response.output_text;
      if (typeof response.text === "function") return await response.text();
      if (typeof response.text === "string") return response.text;
      return JSON.stringify(response);
    }

    // If no known interface is available, throw a helpful error:
    throw new Error(
      "AI client does not expose supported methods (models.generateContent, getGenerativeModel, or generate). Check @google/genai SDK version."
    );
  } catch (err) {
    // rethrow after tagging for easier debugging
    throw new Error(`AI invocation failed: ${err.message || err}`);
  }
}

// --- Route 1: Initial Extraction ---
const processDocument = async (req, res) => {
  try {
    if (!req.file || !req.body.query) {
      return res.status(400).json({ error: "File and query are required." });
    }

    const documentText = await parseFile(req.file);
    const userQuery = req.body.query;

    // Build the prompt instructing the model to return ONLY JSON shaped to extractionSchema
    const prompt = [
      "You are an extraction agent.",
      "Given the document text and the user's question, return a JSON object with the EXACT schema described below.",
      "Return valid JSON only — no extra commentary.",
      `Schema: ${JSON.stringify(extractionSchema)}`,
      `Document: ${documentText}`,
      `User Query: ${userQuery}`,
      "Return the most relevant 5-8 keyMetrics (key/value pairs) that answer the user's query.",
    ].join("\n\n");

    // Call AI using the robust wrapper
    const modelResponseText = await callAIForExtraction({
      prompt,
      modelName: "gemini-2.5-flash",
      schema: extractionSchema,
    });

    // Parse the model response text as JSON (it should be strict JSON)
    let extractedData;
    try {
      extractedData = JSON.parse(modelResponseText);
    } catch (parseErr) {
      // If parsing fails, include model raw output for debugging
      console.error("Failed to parse AI response as JSON:", parseErr.message);
      console.error("AI raw output:", modelResponseText);
      return res.status(500).json({
        error: "AI returned non-JSON output. See server logs for raw output.",
        ai_raw: modelResponseText,
      });
    }

    // Return extracted data and the document text / query for the frontend to store/send to n8n
    res.json({
      message: "Extraction successful.",
      extractedData,
      fullDocumentText: documentText,
      userQuery,
    });
  } catch (error) {
    console.error("Extraction Error:", error.message || error);
    res.status(500).json({ error: "Failed to process document with AI." });
  }
};

// --- Route 2: Conditional Email Automation via n8n ---
const sendAlertMail = async (req, res) => {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

  try {
    const { fullDocumentText, extractedData, userQuery, recipientEmail } =
      req.body;
    const generatedEmailBody = `
Here is the extracted information based on your document:

Query: ${userQuery}

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Thank you for using our service.
`;

    if (!N8N_WEBHOOK_URL) {
      return res
        .status(500)
        .json({ error: "N8N_WEBHOOK_URL is not configured." });
    }

    if (!fullDocumentText || !extractedData || !userQuery || !recipientEmail) {
      return res
        .status(400)
        .json({ error: "Missing required fields in request body." });
    }

    // Keep the payload shape you used originally
    const n8nPayload = {
      documentText: fullDocumentText,
      extractedJSON: extractedData,
      userQuery,
      recipientEmail,
      generatedEmailBody, // ensure field name is explicit
    };

    const n8nResponse = await axios.post(N8N_WEBHOOK_URL, n8nPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
    });

    // Expect n8n Respond to Webhook to return: answer, email_body, status
    const responseData =
      n8nResponse && n8nResponse.data ? n8nResponse.data : {};

    res.json({
      message: "n8n workflow triggered successfully.",
      analyticalAnswer: responseData.answer || null,
      generatedEmailBody: responseData.email_body || null,
      automationStatus: responseData.status || "unknown",
      structuredDataExtracted: extractedData,
    });
  } catch (error) {
    // If axios error, include helpful debug info
    if (error.response) {
      console.error(
        "n8n Webhook Error Response:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("n8n Webhook Error:", error.message || error);
    }
    res.status(500).json({ error: "Failed to trigger n8n workflow." });
  }
};

module.exports = { processDocument, sendAlertMail };
