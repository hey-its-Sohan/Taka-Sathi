const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const transactionParserService = require('../services/transactionParserService');
const { success, ApiError } = require('../utils/apiResponse');

/**
 * POST /api/transactions
 * Body EITHER:
 *   { rawInputText, source: 'voice' }        -> parsed via Gemma 4
 *   { amount, type, category, note }          -> manual entry, no AI call needed
 */
const addTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, note, rawInputText, source, date } = req.body;

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
