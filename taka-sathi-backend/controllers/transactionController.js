const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const voiceVerificationService = require('../services/voiceVerificationService');
const transactionParserService = require('../services/transactionParserService');
const { success, ApiError } = require('../utils/apiResponse');

/**
 * POST /api/transactions
 * Body EITHER:
 *   { rawInputText, source: 'voice', audioData, duration } -> parsed via Gemma 4
 *   { amount, type, category, note }                      -> manual entry, no AI call needed
 */
const addTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, note, rawInputText, source, date, audioData, duration } = req.body;

  let activeStaffInfo = {};

  // If Shift Safe Voice is enabled and input is from voice, perform speaker verification
  if (source === 'voice' && req.user.isSafeVoiceEnabled) {
    if (!audioData) {
      throw new ApiError(400, 'নিরাপদ ভয়েস ভেরিফিকেশনের জন্য অডিও ডেটা প্রয়োজন।');
    }

    // Retrieve active profile with baseline audio data
    const userWithVoice = await User.findById(req.user._id).select('+voiceProfiles.audioData');
    if (!userWithVoice || !userWithVoice.activeVoiceProfileId) {
      throw new ApiError(400, 'কোনো সক্রিয় স্টাফ ভয়েস প্রোফাইল সেট করা নেই।');
    }

    const activeProfile = userWithVoice.voiceProfiles.find(
      (vp) => vp.voiceProfileId === userWithVoice.activeVoiceProfileId
    );

    if (!activeProfile || !activeProfile.audioData) {
      throw new ApiError(400, 'সক্রিয় স্টাফ ভয়েস প্রোফাইল বা তার বেসলাইন ডেটা পাওয়া যায়নি।');
    }

    // Perform 1:1 match verification against active staff profile
    const verification = voiceVerificationService.verifyVoice(
      audioData,
      activeProfile.audioData,
      duration || 3,
      activeProfile.duration || 5
    );

    if (!verification.success) {
      throw new ApiError(
        403,
        `ভয়েস মেলেনি: লেনদেনটি শুধুমাত্র বর্তমানে সক্রিয় স্টাফ (${activeProfile.name}) রেজিস্টার করতে পারবেন।`
      );
    }

    // Capture staff details for audit trail logging
    activeStaffInfo = {
      voiceProfileId: activeProfile.voiceProfileId,
      creatorName: activeProfile.name
    };
  }

  let transactionData;

  if (rawInputText && (amount === undefined || type === undefined)) {
    // Voice or free-text entry — let Gemma 4 structure it
    const parsed = await transactionParserService.parseTransactionText(rawInputText);
    transactionData = {
      ...parsed,
      rawInputText,
      source: source || 'voice',
    };
  } else {
    // Manual form entry — already structured, no AI call needed (fast path)
    if (amount === undefined || !type) {
      throw new ApiError(400, 'amount and type are required for manual entries');
    }
    transactionData = {
      amount: Math.abs(amount),
      type,
      category: category || 'other',
      note: note || '',
      rawInputText: rawInputText || '',
      source: 'manual',
    };
  }

  const transaction = await Transaction.create({
    userId: req.user._id,
    ...transactionData,
    ...activeStaffInfo,
    date: date ? new Date(date) : new Date(),
  });

  return success(res, {
    statusCode: 201,
    message: 'Transaction recorded',
    data: transaction,
  });
});

/**
 * GET /api/transactions?startDate=&endDate=&category=&type=&page=&limit=
 */
const getTransactions = asyncHandler(async (req, res) => {
  const { startDate, endDate, category, type, page = 1, limit = 50 } = req.query;

  const filter = { userId: req.user._id };
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
    Transaction.countDocuments(filter),
  ]);

  return success(res, {
    data: {
      transactions,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    },
  });
});

/**
 * GET /api/transactions/:id
 */
const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  return success(res, { data: transaction });
});

/**
 * PUT /api/transactions/:id
 */
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
  if (!transaction) throw new ApiError(404, 'Transaction not found');

  const editableFields = ['amount', 'type', 'category', 'note', 'date'];
  editableFields.forEach((field) => {
    if (req.body[field] !== undefined) transaction[field] = req.body[field];
  });

  await transaction.save();
  return success(res, { message: 'Transaction updated', data: transaction });
});

/**
 * DELETE /api/transactions/:id
 */
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!transaction) throw new ApiError(404, 'Transaction not found');
  return success(res, { message: 'Transaction deleted' });
});

module.exports = {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
