const pdfParse = require("pdf-parse");

const parseFile = async (file) => {
  try {
    const fileExtension = file.originalname.split(".").pop().toLowerCase();

    if (fileExtension === "pdf") {
      const data = await pdfParse(file.buffer);
      return data.text;
    }

    if (fileExtension === "txt") {
      return file.buffer.toString("utf8");
    }

    throw new Error("Unsupported file type.");
  } catch (err) {
    console.error("File Parsing Error:", err.message);
    throw new Error("Could not parse the uploaded file.");
  }
};

module.exports = parseFile;
