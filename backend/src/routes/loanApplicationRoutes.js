const express = require("express");

const {
  createApplication,
  getMyApplications,
  getApplicationById,
} = require("../controllers/loanApplicationController");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Every endpoint in this module requires a logged-in customer.
router.use(requireAuth, allowRoles("CUSTOMER"));

router.post("/", createApplication);
router.get("/my", getMyApplications);
router.get("/:id", getApplicationById);

module.exports = router;