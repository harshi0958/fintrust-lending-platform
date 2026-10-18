
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const LoanDocument = require("../models/LoanDocument");
const { uploadDirectory } = require("../middleware/uploadMiddleware");

const contentTypes = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

async function viewDocumentFile(req, res, next) {
  try {
    const { documentId } = req.params;

    if (!mongoose.isValidObjectId(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await LoanDocument.findById(documentId)
      .select("fileReference documentType status")
      .lean();

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const filename = document.fileReference;

    // Only accept a plain server-generated filename.
    if (
      typeof filename !== "string" ||
      filename !== path.basename(filename)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid stored document reference.",
      });
    }

    const extension = path.extname(filename).toLowerCase();
    const contentType = contentTypes[extension];

    if (!contentType) {
      return res.status(415).json({
        success: false,
        message: "Unsupported stored document format.",
      });
    }

    const root = path.resolve(uploadDirectory);
    const filePath = path.resolve(root, filename);

    if (path.dirname(filePath) !== root) {
      return res.status(400).json({
        success: false,
        message: "Invalid document path.",
      });
    }

    let fileStat;

    try {
      fileStat = await fs.promises.stat(filePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return res.status(404).json({
          success: false,
          message: "Stored document file was not found.",
        });
      }

      throw error;
    }

    if (!fileStat.isFile()) {
      return res.status(404).json({
        success: false,
        message: "Document file is unavailable.",
      });
    }

    res.set({
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Content-Disposition": `inline; filename="document${extension}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    });

    const stream = fs.createReadStream(filePath);

    stream.on("error", (error) => {
      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error);
      }
    });

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

module.exports = { viewDocumentFile };
