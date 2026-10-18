const express = require("express");

const {
  getReviewQueue,
  getReviewApplicationById,
  decideApplication,
} = require("../controllers/loanReviewController");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Every review endpoint requires a valid session and an elevated role.
router.use(requireAuth, allowRoles("LOAN_MANAGER", "ADMIN"));

router.get("/applications", getReviewQueue);
router.get("/applications/:id", getReviewApplicationById);
router.post("/applications/:id/decision", decideApplication);

module.exports = router;