const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('../services/otpService');
const { success, ApiError } = require('../utils/apiResponse');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/request-otp
 * Body: { phoneNumber }
 * Creates the user if new, generates + "sends" an OTP.
 */
const requestOtp = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) throw new ApiError(400, 'phoneNumber is required');

  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({ phoneNumber });
  }

  const code = otpService.generateOtp();
  user.otp = { code, expiresAt: otpService.getExpiryDate() };
  await user.save();

  await otpService.sendOtp(phoneNumber, code);

  return success(res, {
    message: 'OTP sent. Check server logs in demo mode.',
    data: { phoneNumber, isNewUser: !user.isVerified },
  });
});

/**
 * POST /api/auth/verify-otp
 * Body: { phoneNumber, otp }
 * Verifies OTP, marks user verified, returns JWT.
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const { phoneNumber, otp } = req.body;
  if (!phoneNumber || !otp) throw new ApiError(400, 'phoneNumber and otp are required');

  const user = await User.findOne({ phoneNumber }).select('+otp.code +otp.expiresAt');
  if (!user) throw new ApiError(404, 'User not found — request an OTP first');

  const result = otpService.verifyOtp(user.otp?.code, user.otp?.expiresAt, otp);
  if (!result.valid) {
    throw new ApiError(401, `Invalid OTP (${result.reason})`);
  }

  user.isVerified = true;
  user.otp = { code: undefined, expiresAt: undefined };
  await user.save();

  const token = signToken(user._id);

  return success(res, {
    message: 'Login successful',
    data: { token, user: sanitizeUser(user) },
  });
});

/**
 * GET /api/auth/me
 * Protected route — returns the logged-in user's profile.
 */
const getMe = asyncHandler(async (req, res) => {
  return success(res, { data: sanitizeUser(req.user) });
});

/**
 * PUT /api/auth/profile
 * Protected route — updates onboarding profile fields.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'businessName', 'businessType', 'businessStartDate', 'location', 'language'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      req.user[field] = req.body[field];
    }
  });
  await req.user.save();
  return success(res, { message: 'Profile updated', data: sanitizeUser(req.user) });
});

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.otp;
  return obj;
}

module.exports = { requestOtp, verifyOtp, getMe, updateProfile };
