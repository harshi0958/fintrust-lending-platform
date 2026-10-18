const {
  viewDocumentFile,
} = require("../controllers/documentFileController");

const {
  getMyApplicationDocuments,
} = require("../controllers/customerDocumentController");

const express = require("express");

const {
  getVerificationQueue,
  getApplicationDocuments,
  reviewDocument,
} = require("../controllers/documentVerificationController");

const {
  uploadLoanDocument,
} = require("../controllers/documentUploadController");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/authMiddleware");

const {
  uploadDocument,
} = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get(
  "/my/:applicationId",
  requireAuth,
  allowRoles("CUSTOMER"),
  getMyApplicationDocuments
);
// Customer document submission.
// Authentication runs before Multer processes the file.
router.post(
  "/upload",
  requireAuth,
  allowRoles("CUSTOMER"),
  uploadDocument.single("document"),
  uploadLoanDocument
);

// Staff-only document verification endpoints.
router.use(requireAuth, allowRoles("LOAN_MANAGER", "ADMIN"));
router.get("/review/:documentId/file", viewDocumentFile);

router.get("/review", getVerificationQueue);

router.get(
  "/review/applications/:applicationId",
  getApplicationDocuments
);

router.patch("/review/:documentId", reviewDocument);

module.exports = router;
