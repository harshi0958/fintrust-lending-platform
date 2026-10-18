
const mongoose = require("mongoose");
const { z } = require("zod");

const User = require("../models/User");
const LoanApplication = require("../models/LoanApplication");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ============================================
// ADMIN DASHBOARD
// ============================================

const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      roles,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      applicationStatuses,
      applicationTypes,
      amountResult,
      recentApplications,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "ACTIVE" }),
      User.countDocuments({ status: "SUSPENDED" }),

      User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]),

      LoanApplication.countDocuments(),

      LoanApplication.countDocuments({
        status: {
          $in: [
            "SUBMITTED",
            "UNDER_REVIEW",
            "MORE_INFO_REQUIRED",
          ],
        },
      }),

      LoanApplication.countDocuments({
        status: "APPROVED",
      }),

      LoanApplication.countDocuments({
        status: "REJECTED",
      }),

      LoanApplication.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      LoanApplication.aggregate([
        {
          $group: {
            _id: "$loanType",
            count: { $sum: 1 },
          },
        },
      ]),

      LoanApplication.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$requestedAmount" },
          },
        },
      ]),

      LoanApplication.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .populate("applicant", "name email phone")
        .lean(),

      User.find()
        .select("name email phone role status createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,

        roles: roles.map((item) => ({
          role: item._id,
          count: item.count,
        })),

        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,

        applicationStatuses: applicationStatuses.map(
          (item) => ({
            status: item._id,
            count: item.count,
          })
        ),

        applicationTypes: applicationTypes.map((item) => ({
          loanType: item._id,
          count: item.count,
        })),

        totalRequestedAmount: amountResult[0]?.total || 0,
        recentApplications,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN USER MANAGEMENT
// ============================================

const getUsers = async (req, res, next) => {
  try {
    const schema = z.object({
      search: z.string().trim().max(100).optional().default(""),

      role: z
        .enum(["CUSTOMER", "LOAN_MANAGER", "ADMIN"])
        .optional(),

      status: z
        .enum(["ACTIVE", "SUSPENDED"])
        .optional(),

      page: z.coerce.number().int().min(1).optional().default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10),
    });

    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid user filters.",
        errors: parsed.error.flatten(),
      });
    }

    const { search, role, status, page, limit } = parsed.data;

    const filter = {};

    if (role) filter.role = role;
    if (status) filter.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(
          "name email phone role status createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ACTIVATE / SUSPEND USER
// ============================================

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const parsed = z
      .object({
        status: z.enum(["ACTIVE", "SUSPENDED"]),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or SUSPENDED.",
      });
    }

    const currentUserId = String(
      req.user?.id ||
      req.user?._id ||
      req.user?.userId ||
      ""
    );

    if (currentUserId && currentUserId === String(id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own account status.",
      });
    }

    const target = await User.findById(id).select(
      "name email role status"
    );

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (target.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be changed here.",
      });
    }

    target.status = parsed.data.status;

    await target.save();

    return res.status(200).json({
      success: true,
      message: `Account ${target.status.toLowerCase()} successfully.`,
      data: {
        user: {
          id: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          status: target.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN APPLICATION OVERSIGHT
// ============================================

const getAdminApplications = async (req, res, next) => {
  try {
    const schema = z.object({
      search: z.string().trim().max(100).optional().default(""),

      status: z
        .enum([
          "SUBMITTED",
          "UNDER_REVIEW",
          "APPROVED",
          "REJECTED",
          "MORE_INFO_REQUIRED",
        ])
        .optional(),

      loanType: z
        .enum([
          "PERSONAL",
          "HOME",
          "EDUCATION",
          "VEHICLE",
          "GOLD",
          "PROPERTY",
        ])
        .optional(),

      page: z.coerce.number().int().min(1).optional().default(1),

      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(10),
    });

    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid application filters.",
        errors: parsed.error.flatten(),
      });
    }

    const { search, status, loanType, page, limit } = parsed.data;

    const filter = {};

    if (status) filter.status = status;
    if (loanType) filter.loanType = loanType;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");

      const matchingUsers = await User.find({
        $or: [
          { name: regex },
          { email: regex },
          { phone: regex },
        ],
      })
        .select("_id")
        .lean();

      const searchOr = [
        { applicationNumber: regex },
        { loanType: regex },
      ];

      if (matchingUsers.length > 0) {
        searchOr.push({
          applicant: {
            $in: matchingUsers.map((user) => user._id),
          },
        });
      }

      filter.$or = searchOr;
    }

    const [applications, total] = await Promise.all([
      LoanApplication.find(filter)
        .populate("applicant", "name email phone")
        .populate("reviewedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      LoanApplication.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// ADMIN APPLICATION DETAILS
// ============================================

const getAdminApplicationDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID.",
      });
    }

    const application = await LoanApplication.findById(id)
      .populate("applicant", "name email phone")
      .populate("reviewedBy", "name email role")
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Loan application not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: { application },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// EXPORT CONTROLLERS
// ============================================

module.exports = {
  getAdminDashboard,
  getUsers,
  updateUserStatus,
  getAdminApplications,
  getAdminApplicationDetails,
};
