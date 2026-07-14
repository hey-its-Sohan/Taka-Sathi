const logger = require('../utils/logger');

const DEMO_MODE = process.env.OTP_DEMO_MODE === 'true';
const DEMO_OTP_CODE = '123456';
const EXPIRES_MIN = parseInt(process.env.OTP_EXPIRES_IN_MINUTES, 10) || 5;

/**
 * Generates a 6-digit OTP. In demo mode, always returns a fixed code so
 * judges/testers don't need a real SMS gateway to try the app.
 * Swap the "send" step for a real SMS provider (Twilio, SSL Wireless,
 * bKash SMS gateway, etc.) post-hackathon.
 */
function generateOtp() {
  if (DEMO_MODE) return DEMO_OTP_CODE;
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getExpiryDate() {
  return new Date(Date.now() + EXPIRES_MIN * 60 * 1000);
}

/**
 * "Sends" the OTP. In demo mode this just logs it to the server console
 * instead of dispatching a real SMS — makes local/offline hackathon demos
 * possible without an SMS budget.
 */
async function sendOtp(phoneNumber, code) {
  if (DEMO_MODE) {
    logger.info(`[DEMO MODE] OTP for ${phoneNumber}: ${code} (use this to log in)`);
    return { delivered: true, demo: true };
  }
  // TODO: integrate real SMS gateway here for production
  logger.warn('OTP_DEMO_MODE is false but no real SMS provider is wired up yet.');
  return { delivered: false, demo: false };
}

function verifyOtp(storedCode, storedExpiry, submittedCode) {
  if (!storedCode || !storedExpiry) return { valid: false, reason: 'no_otp_requested' };
  if (new Date() > new Date(storedExpiry)) return { valid: false, reason: 'expired' };
  if (storedCode !== submittedCode) return { valid: false, reason: 'mismatch' };
  return { valid: true };
}

module.exports = { generateOtp, getExpiryDate, sendOtp, verifyOtp };
