
const express = require("express");

const {
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  getAdminApplications,
  getAdminApplicationDetails,
} = require("../controllers/adminController");

const {
  requireAuth,
  allowRoles,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All admin routes require authentication and ADMIN role.
router.use(requireAuth, allowRoles("ADMIN"));

// Dashboard analytics
router.get("/dashboard", getAdminDashboard);

// User management
router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

// Application oversight
router.get("/applications", getAdminApplications);
router.get("/applications/:id", getAdminApplicationDetails);

module.exports = router;
