const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const loanApplicationRoutes = require("./routes/loanApplicationRoutes");
const loanReviewRoutes = require("./routes/loanReviewRoutes");
const documentVerificationRoutes = require("./routes/documentVerificationRoutes");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Apply API rate limiting BEFORE the API routers.
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FinTrust API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/loans/applications", loanApplicationRoutes);
app.use("/api/loans/review", loanReviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/documents", documentVerificationRoutes);

module.exports = app;