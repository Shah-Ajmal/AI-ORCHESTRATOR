---

## 💻 Technology Stack

| Component | Technology | Key Function / Role |
| :--- | :--- | :--- |
| **Backend** | Node.js (Express) | Serves the API, handles file uploads (`multer`), and integrates the Gemini API. |
| **Frontend** | React (Vite) | Provides the user interface for file upload and status display. |
| **AI/LLM** | `@google/genai` (Gemini API) | Performs **Structured Output** based on a JSON Schema for reliable data extraction. |
| **Automation** | n8n | External workflow for conditional logic, data formatting, and email delivery. |

---

## 🚀 Getting Started

### Prerequisites

You need the following credentials and tools:

1.  **Node.js:** Installed locally (version 18+).
2.  **API Key:** A valid **Gemini API Key**.
3.  **n8n Webhook URL:** An active n8n workflow with a Webhook node.

### 1. Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd AI-ORCHESTRATOR/backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a file named `.env` in the `backend` folder and add your configuration:

    ```env
    # Server Configuration
    PORT=4000
    FRONTEND_URL=http://localhost:5173 
    
    # Gemini API Key
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
    
    # n8n Automation Webhook (Example: https://[your_n8n_url]/webhook-test/alert-trigger)
    N8N_WEBHOOK_URL=YOUR_ACTIVE_N8N_WEBHOOK_URL_HERE
    ```

4.  Start the backend server:
    ```bash
    npm start
    # Server running on port 4000
    ```

### 2. Frontend Setup

1.  Open a new terminal session and navigate to the frontend directory:
    ```bash
    cd AI-ORCHESTRATOR/frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a file named `.env` in the `frontend` folder:

    ```env
    VITE_REACT_APP_API_URL=http://localhost:4000
    ```

4.  Start the frontend application:
    ```bash
    npm run dev
    # Application runs, typically on port 5173. Open this in your browser.
    ```

---

## 📧 n8n Workflow Configuration (Critical)

The automation step requires careful configuration inside your n8n workflow.

### A. Data Pathing Fix

Due to how the n8n **Webhook node** processes the incoming request body, all data sent from the backend is nested under the **`body`** property.

| Frontend Data Key | Correct n8n Expression |
| :--- | :--- |
| `recipientEmail` | `{{$json.body.recipientEmail}}` |
| `extractedData` | `{{$json.body.extractedJSON}}` |
| `generatedEmailBody` | `{{$json.body.generatedEmailBody}}` |

### B. HTML Email Configuration

For a successful, formatted email, ensure the **Code** node and **Send a message** node are configured as follows:

1.  **Code Node:** Use JavaScript to iterate over `$json.body.extractedJSON.keyMetrics` and construct a clean HTML string. Store the result in a new property (e.g., `emailHtmlBody`).
2.  **Send a message Node (Gmail/SMTP):**
    * **Email Type:** Must be set to **`HTML`**.
    * **Message Field:** Must reference the HTML property created in the Code node (e.g., `{{$json.emailHtmlBody}}`).
    * **Credentials:** If using Gmail, you **must use a Google App Password** for authentication.

---

## 📌 Common Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **500 Error on Automation** | Backend failed to connect to the `N8N_WEBHOOK_URL`. | Verify `N8N_WEBHOOK_URL` in `backend/.env` is correct, and the n8n workflow is **Active**. |
| **"Cannot read properties of undefined..."** | The n8n node is using the wrong data path. | **Fix the Path:** Use the nested expression: `{{$json.body.yourProperty}}` |
| **Raw JSON in Email** | The **Send a message** node is using the `generatedEmailBody` property which contains the raw JSON string. | Use the **Code** node to create a clean HTML string, and reference that new property instead. |