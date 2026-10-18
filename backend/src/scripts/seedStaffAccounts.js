const dns = require("node:dns");

// Use the working router DNS for Node.js DNS queries.
dns.setServers(["192.168.0.1"]);
require("dotenv").config();

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

async function seedStaffAccounts() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MongoDB connection URI is missing from .env.");
  }

  if (
    !process.env.ADMIN_LOGIN_PASSWORD ||
    !process.env.MANAGER_LOGIN_PASSWORD
  ) {
    throw new Error("Staff login passwords are missing from .env.");
  }

  await mongoose.connect(mongoUri);

  const staffAccounts = [
    {
      name: "Harshit",
      email: "admin@fintrust.local",
      phone: "0000000001",
      password: process.env.ADMIN_LOGIN_PASSWORD,
      role: "ADMIN",
    },
    {
      name: "Loan Manager",
      email: "loanmanager@fintrust.local",
      phone: "0000000002",
      password: process.env.MANAGER_LOGIN_PASSWORD,
      role: "LOAN_MANAGER",
    },
  ];

  try {
    for (const account of staffAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);

      await User.findOneAndUpdate(
        { email: account.email },
        {
          $set: {
            name: account.name,
            phone: account.phone,
            passwordHash,
            role: account.role,
            status: "ACTIVE",
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`${account.role} account is ready.`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

seedStaffAccounts().catch((error) => {
  console.error("Staff account setup failed:", error.message);
  process.exitCode = 1;
});
