const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const FinancialSnapshot = require('../models/FinancialSnapshot');
const financeEngine = require('../services/financeEngine');
const { success } = require('../utils/apiResponse');

/**
 * GET /api/dashboard/overview
 * One-call aggregate endpoint for the React dashboard: latest snapshot,
 * recent transactions, and a lightweight category breakdown — avoids the
 * frontend needing to make 4-5 separate requests on load.
 */
const getOverview = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [latestSnapshot, recentTransactions] = await Promise.all([
    FinancialSnapshot.findOne({ userId, periodType: 'weekly' }).sort({ periodStart: -1 }),
    Transaction.find({ userId }).sort({ date: -1 }).limit(10),
  ]);

  const allRecent = await Transaction.find({ userId }).sort({ date: -1 }).limit(200).lean();
  const categoryBreakdown = financeEngine.computeCategoryBreakdown(allRecent);

  return success(res, {
    data: {
      snapshot: latestSnapshot || null,
      recentTransactions,
      categoryBreakdown,
      hasSnapshot: !!latestSnapshot,
    },
  });
});

module.exports = { getOverview };
