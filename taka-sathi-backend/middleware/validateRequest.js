const { validationResult } = require('express-validator');
const { failure } = require('../utils/apiResponse');

/**
 * Runs after an array of express-validator checks in a route definition.
 * Usage: router.post('/x', [body('amount').isNumeric()], validateRequest, controllerFn)
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return failure(res, {
      statusCode: 422,
      message: 'Validation failed',
      error: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validateRequest;
