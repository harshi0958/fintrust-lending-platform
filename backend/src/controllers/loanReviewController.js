const mongoose = require("mongoose");
const { z } = require("zod");
const LoanApplication = require("../models/LoanApplication");

const decisionSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().trim().min(5).max(1000),
  })
  .strict();

const allowedQueueStatuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
  "APPROVED",
  "REJECTED",
];

function parsePagination(query) {
  const pageValue = Number.parseInt(query.page ?? "1", 10);
  const limitValue = Number.parseInt(query.limit ?? "10", 10);

  const page = Number.isInteger(pageValue) && pageValue > 0
    ? Math.min(pageValue, 1000000)
    : 1;

  const limit = Number.isInteger(limitValue) && limitValue > 0
    ? Math.min(limitValue, 100)
    : 10;

  return { page, limit };
}

// GET /api/loans/review/applications
async function getReviewQueue(req, res) {
  const { page, limit } = parsePagination(req.query);
  const status = req.query.status ?? "SUBMITTED";

  if (!allowedQueueStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid application status filter.",
    });
  }

  const filter = { status };
  const skip = (page - 1) * limit;

  const [applications, total] = await Promise.all([
    LoanApplication.find(filter)
      .select("-decisionHistory")
      .populate("applicant", "name email phone")
      .sort({ createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    LoanApplication.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// GET /api/loans/review/applications/:id
async function getReviewApplicationById(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid application ID.",
    });
  }

  const application = await LoanApplication.findById(id)
    .populate("applicant", "name email phone")
    .populate("reviewedBy", "name email")
    .lean();

  if (!application) {
    return res.status(404).json({
      success: false,
      message: "Loan application not found.",
    });
  }

  return res.status(200).json({
    success: true,
    application,
  });
}

// POST /api/loans/review/applications/:id/decision
async function decideApplication(req, res) {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid application ID.",
    });
  }

  const parsed = decisionSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid decision and review notes.",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const { status, notes } = parsed.data;
  const actionAt = new Date();

  // Atomic condition: only a currently SUBMITTED application can be decided.
  // Concurrent decisions cannot both change the same application.
  const application = await LoanApplication.findOneAndUpdate(
    {
      _id: id,
      status: "SUBMITTED",
    },
    {
      $set: {
        status,
        reviewedBy: req.user._id,
        reviewedAt: actionAt,
        reviewNotes: notes,
      },
      $push: {
        decisionHistory: {
          actor: req.user._id,
          status,
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
    .populate("applicant", "name email phone")
    .populate("reviewedBy", "name email");

  if (application) {
    return res.status(200).json({
      success: true,
      message: `Loan application ${status.toLowerCase()} successfully.`,
      application,
    });
  }

  // Distinguish a missing record from an already-reviewed application.
  const existing = await LoanApplication.findById(id)
    .select("_id status")
    .lean();

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Loan application not found.",
    });
  }

  return res.status(409).json({
    success: false,
    message: "This application is no longer awaiting a decision.",
    currentStatus: existing.status,
  });
}

module.exports = {
  getReviewQueue,
  getReviewApplicationById,
  decideApplication,
};