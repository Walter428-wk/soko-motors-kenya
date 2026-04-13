require('dotenv').config(); // ← ADD THIS LINE

const app = require("./app");
const { connectDatabase } = require("./config");

const port = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(port, () => {
      console.log(`Soko Motors Kenya API running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start API:", error.message);
    process.exit(1);
  }
};

startServer();