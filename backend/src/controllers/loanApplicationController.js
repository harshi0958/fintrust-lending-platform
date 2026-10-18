const crypto = require("node:crypto");
const mongoose = require("mongoose");
const LoanApplication = require("../models/LoanApplication");
const {
  createLoanApplicationSchema,
} = require("../validators/loanApplicationValidator");

function generateApplicationNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();

  return `FT-${year}${month}-${suffix}`;
}

async function createApplication(req, res, next) {
  try {
    const parsed = createLoanApplicationSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please correct the loan application details.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const application = await LoanApplication.create({
      ...parsed.data,
      applicationNumber: generateApplicationNumber(),
      applicant: req.user._id,
      status: "SUBMITTED",
      decisionHistory: [
        {
          actor: req.user._id,
          status: "SUBMITTED",
          notes: "Application submitted by customer.",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Your loan application has been submitted successfully.",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Application number conflict. Please submit again.",
      });
    }

    next(error);
  }
}

async function getMyApplications(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 10;
    const limit = Math.min(50, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    const filter = { applicant: req.user._id };

    const [applications, total] = await Promise.all([
      LoanApplication.find(filter)
        .sort({ createdAt: -1 })
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
  } catch (error) {
    next(error);
  }
}

async function getApplicationById(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
    }

    const application = await LoanApplication.findOne({
      _id: req.params.id,
      applicant: req.user._id,
    }).lean();

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
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createApplication,
  getMyApplications,
  getApplicationById,
};