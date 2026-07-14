const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const { ApiError } = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * Protects routes by verifying the JWT sent in the Authorization header.
 * Usage: router.get('/protected', protect, controllerFn)
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized — no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-otp');

    if (!user) {
      throw new ApiError(401, 'Not authorized — user no longer exists');
    }

    req.user = user; // attach to request for downstream controllers
    next();
  } catch (err) {
    throw new ApiError(401, 'Not authorized — invalid or expired token');
  }
});

module.exports = { protect };
