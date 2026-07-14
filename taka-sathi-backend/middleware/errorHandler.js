const logger = require('../utils/logger');

/**
 * Catches 404s for unmatched routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found — ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Central error handler. Every thrown ApiError or unexpected error
 * ends up here via next(err) or asyncHandler's automatic forwarding.
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode && err.statusCode !== 200 ? err.statusCode : 500;

  if (statusCode === 500) {
    logger.error(err.stack || err.message);
  } else {
    logger.warn(`${statusCode} — ${err.message} — ${req.method} ${req.originalUrl}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
