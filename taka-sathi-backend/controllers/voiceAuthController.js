const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require('../models/User');
const voiceVerificationService = require('../services/voiceVerificationService');
const { success, ApiError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Enroll a user's voice print.
 * POST /api/auth/voice/enroll
 */
const enrollVoice = asyncHandler(async (req, res) => {
  const { audioData, duration, mimeType } = req.body;

  if (!audioData) {
    throw new ApiError(400, 'ভয়েস অডিও ফাইল পাওয়া যায়নি।');
  }
  if (!duration || duration < 5) {
    throw new ApiError(400, 'ভয়েস পাসওয়ার্ড সেভ করার জন্য কমপক্ষে ৫ সেকেন্ড কথা বলতে হবে।');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  // Save the voice print data (base64) and mark as enrolled
  user.voicePrint = {
    audioData,
    duration,
    mimeType: mimeType || 'audio/webm',
    enrolledAt: new Date()
  };
  user.voiceEnrolled = true;

  await user.save();

  logger.info(`Voice print enrolled successfully for user: ${user._id} (${user.phoneNumber})`);

  return success(res, {
    statusCode: 200,
    message: 'ভয়েস পাসওয়ার্ড সফলভাবে নিবন্ধিত হয়েছে!',
    data: {
      voiceEnrolled: true,
      duration,
      enrolledAt: user.voicePrint.enrolledAt
    }
  });
});

/**
 * Verify a user's voice print.
 * POST /api/auth/voice/verify
 */
const verifyVoice = asyncHandler(async (req, res) => {
  const { audioData, duration } = req.body;

  if (!audioData) {
    throw new ApiError(400, 'ভয়েস অডিও ফাইল পাওয়া যায়নি।');
  }

  // Select the voice print's audioData explicitly as it is set to select: false by default
  const user = await User.findById(req.user._id).select('+voicePrint.audioData');
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  if (!user.voiceEnrolled || !user.voicePrint || !user.voicePrint.audioData) {
    throw new ApiError(400, 'আপনার কণ্ঠস্বর আগে নিবন্ধন করা হয়নি। দয়া করে আগে কণ্ঠস্বর নিবন্ধন করুন।');
  }

  // Run the speaker verification comparing the live sample to the enrolled baseline
  const result = voiceVerificationService.verifyVoice(
    audioData,
    user.voicePrint.audioData,
    duration || 3,
    user.voicePrint.duration
  );

  if (result.success) {
    logger.info(`Voice verified successfully for user: ${user._id} with score: ${result.score}`);
    return success(res, {
      statusCode: 200,
      message: result.reason,
      data: {
        verified: true,
        score: result.score
      }
    });
  } else {
    logger.warn(`Voice verification failed for user: ${user._id} with score: ${result.score} - Reason: ${result.reason}`);
    throw new ApiError(401, result.reason);
  }
});

/**
 * Delete a user's voice print.
 * DELETE /api/auth/voice
 */
const deleteVoice = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  // Clear fields and mark as not enrolled
  user.voicePrint = undefined;
  user.voiceEnrolled = false;
  
  await user.save();

  logger.info(`Voice print deleted successfully for user: ${user._id} (${user.phoneNumber})`);

  return success(res, {
    statusCode: 200,
    message: 'ভয়েস পাসওয়ার্ড সফলভাবে মুছে ফেলা হয়েছে!',
    data: {
      voiceEnrolled: false
    }
  });
});

/**
 * Enroll a new staff voice profile.
 * POST /api/auth/voice-profiles/enroll
 */
const enrollVoiceProfile = asyncHandler(async (req, res) => {
  const { name, audioData, duration, mimeType } = req.body;
  if (!name || !audioData) {
    throw new ApiError(400, 'নাম এবং অডিও ডেটা আবশ্যক।');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  if (user.voiceProfiles && user.voiceProfiles.length >= 3) {
    throw new ApiError(400, 'সর্বোচ্চ ৩টি স্টাফ ভয়েস প্রোফাইল যুক্ত করা সম্ভব।');
  }

  const voiceProfileId = new mongoose.Types.ObjectId().toString();

  user.voiceProfiles.push({
    name,
    voiceProfileId,
    audioData,
    duration: duration || 0,
    mimeType: mimeType || 'audio/webm',
    enrolledAt: new Date()
  });

  // Auto set active if it's the first profile
  if (!user.activeVoiceProfileId) {
    user.activeVoiceProfileId = voiceProfileId;
  }

  await user.save();

  logger.info(`Staff voice profile enrolled: ${name} (${voiceProfileId}) for user ${user._id}`);

  // Return updated user profile fields (without raw audioData)
  const updatedUser = await User.findById(req.user._id);
  return success(res, {
    statusCode: 201,
    message: 'স্টাফ ভয়েস প্রোফাইল সফলভাবে নিবন্ধিত হয়েছে!',
    data: {
      voiceProfiles: updatedUser.voiceProfiles,
      activeVoiceProfileId: updatedUser.activeVoiceProfileId
    }
  });
});

/**
 * Delete a staff voice profile.
 * DELETE /api/auth/voice-profiles/:id
 */
const deleteVoiceProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  const profileIndex = user.voiceProfiles.findIndex(vp => vp.voiceProfileId === id);
  if (profileIndex === -1) {
    throw new ApiError(404, 'ভয়েস প্রোফাইল পাওয়া যায়নি।');
  }

  user.voiceProfiles.splice(profileIndex, 1);

  // If the active profile was deleted, select another one or null
  if (user.activeVoiceProfileId === id) {
    user.activeVoiceProfileId = user.voiceProfiles.length > 0 ? user.voiceProfiles[0].voiceProfileId : null;
  }

  await user.save();

  logger.info(`Staff voice profile deleted: ${id} for user ${user._id}`);

  return success(res, {
    statusCode: 200,
    message: 'স্টাফ ভয়েস প্রোফাইল সফলভাবে মুছে ফেলা হয়েছে!',
    data: {
      voiceProfiles: user.voiceProfiles,
      activeVoiceProfileId: user.activeVoiceProfileId
    }
  });
});

/**
 * Update shift-based voice security settings.
 * PUT /api/auth/voice-profiles/settings
 */
const updateVoiceSettings = asyncHandler(async (req, res) => {
  const { isSafeVoiceEnabled, activeVoiceProfileId } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, 'ব্যবহারকারী পাওয়া যায়নি।');
  }

  if (isSafeVoiceEnabled !== undefined) {
    user.isSafeVoiceEnabled = !!isSafeVoiceEnabled;
  }

  if (activeVoiceProfileId !== undefined) {
    if (activeVoiceProfileId !== null) {
      const exists = user.voiceProfiles.some(vp => vp.voiceProfileId === activeVoiceProfileId);
      if (!exists) {
        throw new ApiError(400, 'নির্বাচনকৃত স্টাফ প্রোফাইল পাওয়া যায়নি।');
      }
    }
    user.activeVoiceProfileId = activeVoiceProfileId;
  }

  await user.save();

  logger.info(`Safe Voice Settings updated for user ${user._id}: enabled=${user.isSafeVoiceEnabled}, active=${user.activeVoiceProfileId}`);

  return success(res, {
    statusCode: 200,
    message: 'সেটিংস সফলভাবে আপডেট করা হয়েছে!',
    data: {
      isSafeVoiceEnabled: user.isSafeVoiceEnabled,
      activeVoiceProfileId: user.activeVoiceProfileId
    }
  });
});

module.exports = {
  enrollVoice,
  verifyVoice,
  deleteVoice,
  enrollVoiceProfile,
  deleteVoiceProfile,
  updateVoiceSettings
};
