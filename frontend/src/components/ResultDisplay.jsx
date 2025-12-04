import React from "react";

const ResultDisplay = ({ results }) => {
  const {
    structuredDataExtracted,
    analyticalAnswer,
    generatedEmailBody,
    automationStatus,
  } = results;

  // Helper component for styled status output
  const StatusPill = ({ status }) => {
    let colorClass = "bg-gray-200 text-gray-700";
    if (status && status.toLowerCase().includes("sent")) {
      colorClass = "bg-green-100 text-green-700 border border-green-500";
    } else if (status && status.toLowerCase().includes("skipped")) {
      colorClass = "bg-blue-100 text-blue-700 border border-blue-500";
    } else if (
      status &&
      (status.toLowerCase().includes("failed") ||
        status.toLowerCase().includes("unknown"))
    ) {
      colorClass = "bg-red-100 text-red-700 border border-red-500";
    }

    return (
      <span
        className={`px-4 py-1 text-sm font-semibold rounded-full shadow-inner ${colorClass}`}
      >
        {status || "Awaiting automation results..."}
      </span>
    );
  };

  return (
    <div className="mt-10 p-6 bg-white shadow-2xl rounded-xl border border-gray-100">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-3">
        📊 Orchestration Results
      </h2>

      {/* 1. Structured Data Extracted */}
      <div className="mb-8">
        <h4 className="text-xl font-bold text-indigo-700 mb-3">
          1. Structured Data Extracted (AI)
        </h4>
        {structuredDataExtracted && structuredDataExtracted.keyMetrics ? (
          <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {Array.isArray(structuredDataExtracted.keyMetrics) &&
                  structuredDataExtracted.keyMetrics.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-blue-50 transition duration-100"
                    >
                      <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-800">
                        {item.key}
                      </td>
                      <td className="px-6 py-4 whitespace-normal text-sm text-gray-600">
                        {item.value}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic p-2">
            Awaiting document extraction...
          </p>
        )}
      </div>

      {/* 4. Email Automation Status */}
      <div className="mb-8 p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-lg shadow-inner">
        <h4 className="text-xl font-bold text-indigo-700 mb-2">
          4. Email Automation Status (n8n)
        </h4>
        <StatusPill status={automationStatus} />
      </div>

      {/* 2. Final Analytical Answer */}
      <div className="mb-8">
        <h4 className="text-xl font-bold text-indigo-700 mb-2">
          2. Final Analytical Answer (from n8n)
        </h4>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-700 shadow-inner">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {analyticalAnswer || "Awaiting automation results..."}
          </pre>
        </div>
      </div>

      {/* 3. Generated Email Body */}
      <div className="mb-8">
        <h4 className="text-xl font-bold text-indigo-700 mb-3">
          3. Generated Email Body (from n8n)
        </h4>
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300 text-gray-800 shadow-md">
          <pre className="text-sm italic whitespace-pre-wrap">
            {generatedEmailBody ||
              "N/A - Email Body will appear here if the workflow is executed."}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
