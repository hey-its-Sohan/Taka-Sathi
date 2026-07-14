const asyncHandler = require('express-async-handler');
const FinancialSnapshot = require('../models/FinancialSnapshot');
const insightService = require('../services/insightService');
const { success, ApiError } = require('../utils/apiResponse');

/**
 * POST /api/insights/summary
 * Body: { periodType: 'daily' | 'weekly' | 'monthly' }
 * Runs the finance engine + Gemma 4 narrative generation, caches result
 * as a FinancialSnapshot (upsert), and returns it.
 */
const generateSummary = asyncHandler(async (req, res) => {
  const { periodType = 'weekly' } = req.body;
  if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
    throw new ApiError(400, 'periodType must be daily, weekly, or monthly');
  }

  const result = await insightService.generateFinancialSummary(
    req.user._id,
    periodType,
    req.user.language || 'bn'
  );

  const snapshot = await FinancialSnapshot.findOneAndUpdate(
    { userId: req.user._id, periodType, periodStart: result.periodStart },
    {
      userId: req.user._id,
      periodType,
      periodStart: result.periodStart,
      periodEnd: result.periodEnd,
      totalIncome: result.totalIncome,
      totalExpense: result.totalExpense,
      netProfit: result.netProfit,
      healthScore: result.healthScore,
      healthScoreExplanation: result.healthScoreExplanation,
      cashflowForecast: result.cashflowForecast,
      warningFlag: result.warningFlag,
      warningMessage: result.warningMessage,
      generatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return success(res, {
    message: 'Summary generated',
    data: { ...snapshot.toObject(), summaryText: result.summaryText },
  });
});

/**
 * GET /api/insights/latest?periodType=weekly
 * Returns the most recently cached snapshot without re-invoking Gemma 4 —
 * used by the dashboard for fast loads.
 */
const getLatestSummary = asyncHandler(async (req, res) => {
  const { periodType = 'weekly' } = req.query;

  const snapshot = await FinancialSnapshot.findOne({ userId: req.user._id, periodType }).sort({
    periodStart: -1,
  });

  if (!snapshot) {
    return success(res, {
      message: 'No summary generated yet — POST /api/insights/summary first',
      data: null,
    });
  }

  return success(res, { data: snapshot });
});

module.exports = { generateSummary, getLatestSummary };
