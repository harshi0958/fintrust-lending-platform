
const mongoose = require("mongoose");
const LoanApplication = require("../models/LoanApplication");
const LoanDocument = require("../models/LoanDocument");

async function getMyApplicationDocuments(req, res, next) {
  try {
    const { applicationId } = req.params;

    if (!mongoose.isValidObjectId(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan application ID.",
      });
    }

    const application = await LoanApplication.findOne({
      _id: applicationId,
      applicant: req.user._id,
    }).select("_id applicationNumber status");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    const documents = await LoanDocument.find({
      application: application._id,
      submittedBy: req.user._id,
    })
      .select("-fileReference")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      application,
      documents,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyApplicationDocuments,
};
