
const mongoose = require("mongoose");

const verificationHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["SUBMITTED", "VERIFIED", "REJECTED", "RESUBMITTED"],
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

const loanDocumentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanApplication",
      required: true,
      immutable: true,
      index: true,
    },

    documentType: {
      type: String,
      enum: [
        "AADHAAR",
        "PAN",
        "SALARY_SLIP",
        "BANK_PASSBOOK",
        "PROPERTY_DOCUMENT",
        "GOLD_DOCUMENT",
        "IDENTITY_PROOF",
        "ADDRESS_PROOF",
        "OTHER",
      ],
      required: true,
    },

    // Store a private storage key or protected file reference,
    // never a publicly accessible Aadhaar/PAN document URL.
    fileReference: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
      required: true,
      index: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    verificationHistory: {
      type: [verificationHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// An application can contain multiple documents of the same type
// when an applicant uploads a replacement or updated document.
loanDocumentSchema.index({
  application: 1,
  documentType: 1,
  createdAt: -1,
});

loanDocumentSchema.index({
  application: 1,
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model("LoanDocument", loanDocumentSchema);
