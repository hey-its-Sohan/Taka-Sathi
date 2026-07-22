const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { requestOtp, verifyOtp, getMe, updateProfile } = require('../controllers/authController');
const { 
  enrollVoice, 
  verifyVoice, 
  deleteVoice,
  enrollVoiceProfile,
  deleteVoiceProfile,
  updateVoiceSettings
} = require('../controllers/voiceAuthController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const otpLimiter = rateLimit({
  windowMs: (parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MIN, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX, 10) || 5,
  message: { success: false, message: 'Too many OTP requests — please try again later.' },
});

router.post(
  '/request-otp',
  otpLimiter,
  [body('phoneNumber').matches(/^\+?[0-9]{10,14}$/).withMessage('Valid phone number required')],
  validateRequest,
  requestOtp
);

router.post(
  '/verify-otp',
  [
    body('phoneNumber').matches(/^\+?[0-9]{10,14}$/),
    body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits'),
  ],
  validateRequest,
  verifyOtp
);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

// Voice Lock/Password Endpoints
router.post('/voice/enroll', protect, enrollVoice);
router.post('/voice/verify', protect, verifyVoice);
router.delete('/voice', protect, deleteVoice);

// Shift-Based Safe Voice Mode Endpoints
router.post('/voice-profiles/enroll', protect, enrollVoiceProfile);
router.delete('/voice-profiles/:id', protect, deleteVoiceProfile);
router.put('/voice-profiles/settings', protect, updateVoiceSettings);

module.exports = router;
