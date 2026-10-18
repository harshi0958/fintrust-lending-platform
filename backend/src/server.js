
require("dotenv").config();

const app = require("./app");
const connectDatabase = require("./config/database");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`FinTrust API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start FinTrust:", error.message);
    process.exit(1);
  }
}

startServer();
