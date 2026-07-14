/**
 * Standardized response envelope so the React frontend can rely on one shape
 * for every endpoint: { success, message, data, error }.
 */

const success = (res, { message = 'OK', data = null, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const failure = (res, { message = 'Something went wrong', statusCode = 500, error = null } = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || undefined,
  });
};

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { success, failure, ApiError };
