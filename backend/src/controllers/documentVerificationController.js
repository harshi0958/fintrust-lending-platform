
const mongoose = require("mongoose");
const { z } = require("zod");

const LoanApplication = require("../models/LoanApplication");
const LoanDocument = require("../models/LoanDocument");

const reviewSchema = z
  .object({
    status: z.enum(["VERIFIED", "REJECTED"]),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .strict();

const allowedDocumentStatuses = ["PENDING", "VERIFIED", "REJECTED"];

function parsePagination(query) {
  const pageValue = Number.parseInt(query.page ?? "1", 10);
  const limitValue = Number.parseInt(query.limit ?? "10", 10);

  return {
    page:
      Number.isInteger(pageValue) && pageValue > 0
        ? Math.min(pageValue, 1000000)
        : 1,
    limit:
      Number.isInteger(limitValue) && limitValue > 0
        ? Math.min(limitValue, 100)
        : 10,
  };
}

// GET /api/documents/review
// List documents by verification status.
async function getVerificationQueue(req, res, next) {
  try {
    const { page, limit } = parsePagination(req.query);
    const status = req.query.status ?? "PENDING";

    if (!allowedDocumentStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document status filter.",
      });
    }

    const filter = { status };
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      LoanDocument.find(filter)
        .select("-fileReference -verificationHistory")
        .populate({
          path: "application",
          select: "applicationNumber loanType requestedAmount status applicant",
          populate: {
            path: "applicant",
            select: "name email",
          },
        })
        .populate("submittedBy", "name email")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      LoanDocument.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/documents/review/applications/:applicationId
// View document metadata for a specific loan application.
async function getApplicationDocuments(req, res, next) {
  try {
    const { applicationId } = req.params;

    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan application ID.",
      });
    }

    const application = await LoanApplication.findById(applicationId)
      .select("applicationNumber applicant loanType status")
      .populate("applicant", "name email")
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    const documents = await LoanDocument.find({
      application: applicationId,
    })
      .select("-fileReference")
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      application,
      documents,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/documents/review/:documentId
// Verify or reject a pending document.
async function reviewDocument(req, res, next) {
  try {
    const { documentId } = req.params;

    if (!mongoose.isValidObjectId(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid document decision.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { status, notes } = parsed.data;

    if (status === "REJECTED" && notes.length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a rejection reason of at least 5 characters.",
      });
    }

    const actionAt = new Date();

    // Only one reviewer can transition a PENDING document.
    const document = await LoanDocument.findOneAndUpdate(
      {
        _id: documentId,
        status: "PENDING",
      },
      {
        $set: {
          status,
          reviewedBy: req.user._id,
          reviewedAt: actionAt,
          reviewNotes: notes,
        },
        $push: {
          verificationHistory: {
            action: status,
            actor: req.user._id,
            notes,
            actionAt,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("-fileReference")
      .populate("application", "applicationNumber loanType status")
      .populate("submittedBy", "name email")
      .populate("reviewedBy", "name email");

    if (document) {
      return res.status(200).json({
        success: true,
        message: `Document ${status.toLowerCase()} successfully.`,
        document,
      });
    }

    const existing = await LoanDocument.findById(documentId)
      .select("_id status")
      .lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    return res.status(409).json({
      success: false,
      message: "This document is no longer pending verification.",
      currentStatus: existing.status,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getVerificationQueue,
  getApplicationDocuments,
  reviewDocument,
};
