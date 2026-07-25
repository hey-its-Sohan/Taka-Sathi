require("dotenv").config();
const app = require("../app");
const connectDB = require("../config/db");

/**
 * Vercel serverless entry point.
 *
 * Vercel invokes this file as a function for every request.
 * We connect to MongoDB here (cached across warm invocations)
 * then hand off to the Express app.
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: "Database connection failed. Please try again shortly.",
      error: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
  return app(req, res);
};
