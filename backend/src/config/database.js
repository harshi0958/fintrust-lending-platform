
const dns = require("node:dns");

// Use the DNS servers configured for your Wi-Fi network.
dns.setServers(["103.226.206.1", "103.226.206.2"]);

const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    throw new Error("MONGODB_URI is missing. Check backend/.env");
  }

  if (
    !uri.startsWith("mongodb://") &&
    !uri.startsWith("mongodb+srv://")
  ) {
    throw new Error("Invalid MongoDB connection string format");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

module.exports = connectDatabase;
