const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Connects to MongoDB using the URI from environment variables.
 * Exits the process on failure since the app cannot function without a DB.
 */

// Cached connection promise — survives across warm invocations
let cached = global._mongooseCache;
if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

const connectDB = async () => {
  // Already connected — reuse
  if (cached.conn) return cached.conn;

  // Connection in flight — wait for it instead of opening a second one
  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 15000, // give Atlas 15s to respond
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      // Vercel serverless: keep the pool small, connections are short-lived
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
    };

    cached.promise = mongoose
      .connect(process.env.MONGO_URI, opts)
      .then((m) => {
        logger.info(
          `MongoDB connected: ${m.connection.host}/${m.connection.name}`,
        );
        return m;
      })
      .catch((err) => {
        // Clear cached promise so the next request retries
        cached.promise = null;
        logger.error(`MongoDB connection failed: ${err.message}`);
        throw err; // propagate — do NOT call process.exit()
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};
module.exports = connectDB;
