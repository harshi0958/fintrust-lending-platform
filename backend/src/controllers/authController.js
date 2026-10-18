
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(20),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(72),
});

const STAFF_LOGIN = {
  "harshit@admin": {
    email: "admin@fintrust.local",
    role: "ADMIN",
  },
  loanmanager: {
    email: "loanmanager@fintrust.local",
    role: "LOAN_MANAGER",
  },
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

function createSession(res, user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }

  const token = jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("fintrust_token", token, cookieOptions());
}

async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please check your registration details.",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const name = parsed.data.name;
    const email = parsed.data.email.toLowerCase();
    const phone = parsed.data.phone;
    const password = parsed.data.password;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "CUSTOMER",
    });

    createSession(res, user);

    return res.status(201).json({
      success: true,
      message: "Your FinTrust account has been created.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    next(error);
  }
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Please enter a username/email and password.",
      });
    }

    const identifier = parsed.data.identifier.trim();
    const staffAccount = STAFF_LOGIN[identifier.toLowerCase()];

    const email = staffAccount
      ? staffAccount.email
      : identifier.toLowerCase();

    const user = await User.findOne({ email }).select("+passwordHash");

    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.passwordHash))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password.",
      });
    }

    // Staff usernames must resolve to their intended database roles.
    if (staffAccount && user.role !== staffAccount.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password.",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive. Please contact support.",
      });
    }

    createSession(res, user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  res.clearCookie("fintrust_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "You have been logged out.",
  });
}

function getCurrentUser(req, res) {
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
};
