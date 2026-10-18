const mongoose = require("mongoose");

const decisionHistorySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "MORE_INFO_REQUIRED",
      ],
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    actionAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },

    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true,
      index: true,
    },

    loanType: {
      type: String,
      enum: [
        "PERSONAL",
        "HOME",
        "EDUCATION",
        "VEHICLE",
        "GOLD",
        "PROPERTY",
      ],
      required: true,
    },

    requestedAmount: {
      type: Number,
      required: true,
      min: 1,
      max: 100000000,
    },

    tenureMonths: {
      type: Number,
      required: true,
      min: 1,
      max: 360,
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },

    employmentType: {
      type: String,
      enum: ["SALARIED", "SELF_EMPLOYED", "STUDENT", "OTHER"],
      required: true,
    },

    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
      max: 1000000000,
    },

    employerName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "MORE_INFO_REQUIRED",
      ],
      default: "SUBMITTED",
      required: true,
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    decisionHistory: {
      type: [decisionHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

loanApplicationSchema.index({ applicant: 1, createdAt: -1 });

module.exports = mongoose.model(
  "LoanApplication",
  loanApplicationSchema
);