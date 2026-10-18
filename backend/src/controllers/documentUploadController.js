
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { z } = require("zod");

const LoanApplication = require("../models/LoanApplication");
const LoanDocument = require("../models/LoanDocument");
const { uploadDirectory } = require("../middleware/uploadMiddleware");

const uploadSchema = z
  .object({
    applicationId: z.string().trim().min(1),
    documentType: z.enum([
      "AADHAAR",
      "PAN",
      "SALARY_SLIP",
      "BANK_PASSBOOK",
      "PROPERTY_DOCUMENT",
      "GOLD_DOCUMENT",
      "IDENTITY_PROOF",
      "ADDRESS_PROOF",
      "OTHER",
    ]),
    resubmitDocumentId: z.string().optional(),
  })
  .strict();

const allowedMimeSignatures = [
  {
    mime: "application/pdf",
    signature: Buffer.from("%PDF-"),
  },
  {
    mime: "image/jpeg",
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  {
    mime: "image/png",
    signature: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]),
  },
];

async function removeUploadedFile(file) {
  if (!file?.filename) return;

  const filePath = path.resolve(uploadDirectory, file.filename);

  // Only remove files directly inside the private upload directory.
  if (path.dirname(filePath) !== path.resolve(uploadDirectory)) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Unable to remove an unused upload:", error.message);
    }
  }
}

async function uploadLoanDocument(req, res, next) {
  let fileCreated = false;
  let uploadCommitted = false;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a document to upload.",
      });
    }

    fileCreated = true;

    const parsed = uploadSchema.safeParse(req.body);

    if (!parsed.success) {
      await removeUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Invalid document submission details.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const {
      applicationId,
      documentType,
      resubmitDocumentId,
    } = parsed.data;

    if (!/^[a-f\d]{24}$/i.test(applicationId)) {
      await removeUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Invalid loan application ID.",
      });
    }

    if (
      resubmitDocumentId &&
      !mongoose.isValidObjectId(resubmitDocumentId)
    ) {
      await removeUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const application = await LoanApplication.findById(applicationId)
      .select("_id applicant status");

    if (!application) {
      await removeUploadedFile(req.file);

      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    // Customers may upload only to their own applications.
    if (String(application.applicant) !== String(req.user._id)) {
      await removeUploadedFile(req.file);

      return res.status(403).json({
        success: false,
        message: "You cannot upload documents for this application.",
      });
    }

    // Final loan decisions prevent new uploads and resubmissions.
    if (["APPROVED", "REJECTED"].includes(application.status)) {
      await removeUploadedFile(req.file);

      return res.status(409).json({
        success: false,
        message: "Documents cannot be uploaded after a final loan decision.",
      });
    }

    // Check file contents rather than trusting the filename or MIME type.
    const signature = allowedMimeSignatures.find(
      (item) => item.mime === req.file.mimetype
    );

    if (!signature) {
      await removeUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Unsupported document format.",
      });
    }

    const handle = await fs.open(req.file.path, "r");
    let header;

    try {
      header = Buffer.alloc(signature.signature.length);
      const { bytesRead } = await handle.read(
        header,
        0,
        signature.signature.length,
        0
      );

      if (bytesRead !== signature.signature.length) {
        header = Buffer.alloc(0);
      }
    } finally {
      await handle.close();
    }

    if (
      !header
        .subarray(0, signature.signature.length)
        .equals(signature.signature)
    ) {
      await removeUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message:
          "The file content does not match an allowed document format.",
      });
    }

    // Resubmit an existing rejected document while preserving its history.
    if (resubmitDocumentId) {
      const previousDocument = await LoanDocument.findOne({
        _id: resubmitDocumentId,
        application: application._id,
        documentType,
        status: "REJECTED",
        submittedBy: req.user._id,
      });

      if (!previousDocument) {
        await removeUploadedFile(req.file);

        return res.status(409).json({
          success: false,
          message:
            "Only your rejected document of the same type can be resubmitted.",
        });
      }

      const oldFileReference = previousDocument.fileReference;

      const updatedDocument = await LoanDocument.findOneAndUpdate(
        {
          _id: previousDocument._id,
          application: application._id,
          documentType,
          status: "REJECTED",
          submittedBy: req.user._id,
        },
        {
          $set: {
            fileReference: req.file.filename,
            status: "PENDING",
            submittedBy: req.user._id,
            reviewedBy: null,
            reviewedAt: null,
            reviewNotes: "",
          },
          $push: {
            verificationHistory: {
              action: "RESUBMITTED",
              actor: req.user._id,
              notes: "Document resubmitted for verification.",
              actionAt: new Date(),
            },
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedDocument) {
        await removeUploadedFile(req.file);

        return res.status(409).json({
          success: false,
          message: "The document has already changed. Please try again.",
        });
      }

      uploadCommitted = true;

      // Remove the previous file only after the database update succeeds.
      if (
        oldFileReference &&
        path.basename(oldFileReference) === oldFileReference
      ) {
        await fs
          .unlink(path.join(uploadDirectory, oldFileReference))
          .catch((error) => {
            if (error.code !== "ENOENT") {
              console.error(
                "Unable to remove the replaced document:",
                error.message
              );
            }
          });
      }

      return res.status(200).json({
        success: true,
        message: "Document resubmitted successfully.",
        document: {
          _id: updatedDocument._id,
          application: updatedDocument.application,
          documentType: updatedDocument.documentType,
          status: updatedDocument.status,
          submittedBy: updatedDocument.submittedBy,
          createdAt: updatedDocument.createdAt,
          updatedAt: updatedDocument.updatedAt,
        },
      });
    }

    // Create a new document submission.
    const document = await LoanDocument.create({
      application: application._id,
      documentType,
      fileReference: req.file.filename,
      status: "PENDING",
      submittedBy: req.user._id,
      verificationHistory: [
        {
          action: "SUBMITTED",
          actor: req.user._id,
          notes: "Document uploaded for verification.",
          actionAt: new Date(),
        },
      ],
    });

    uploadCommitted = true;

    return res.status(201).json({
      success: true,
      message: "Document uploaded and submitted for verification.",
      document: {
        _id: document._id,
        application: document.application,
        documentType: document.documentType,
        status: document.status,
        submittedBy: document.submittedBy,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    // Do not delete a file after its database record has been committed.
    if (fileCreated && !uploadCommitted) {
      await removeUploadedFile(req.file);
    }

    return next(error);
  }
}

module.exports = {
  uploadLoanDocument,
};
