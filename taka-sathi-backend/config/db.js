const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB using the URI from environment variables.
 * Exits the process on failure since the app cannot function without a DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
