const asyncHandler = require('express-async-handler');
const LoanProduct = require('../models/LoanProduct');
const Transaction = require('../models/Transaction');
const FinancialSnapshot = require('../models/FinancialSnapshot');
const financeEngine = require('../services/financeEngine');
const loanEligibilityEngine = require('../services/loanEligibilityEngine');
const loanExplanationService = require('../services/loanExplanationService');
const { success } = require('../utils/apiResponse');

/**
 * GET /api/loans/products
 * Public-ish list of all active loan products (no eligibility computed).
 */
const getLoanProducts = asyncHandler(async (req, res) => {
  const products = await LoanProduct.find({ isActive: true }).sort({ minMonthlyRevenue: 1 });
  return success(res, { data: products });
});

/**
 * POST /api/loans/check-eligibility
 * Computes the vendor's financial profile from their transaction history,
 * deterministically matches against all loan products, then asks Gemma 4
 * to write plain-Bangla explanations for each result. Caches into the
 * most recent weekly FinancialSnapshot.
 */
const checkEligibility = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [transactions, loanProducts] = await Promise.all([
    Transaction.find({ userId }).lean(),
    LoanProduct.find({ isActive: true }).lean(),
  ]);

  const avgMonthlyRevenue = financeEngine.computeAvgMonthlyRevenue(transactions, 3);
  const recordKeepingDays = financeEngine.computeDaysWithEntries(transactions);
  const businessType = req.user.businessType;

  const profile = { avgMonthlyRevenue, recordKeepingDays, businessType };

  const rawMatches = loanEligibilityEngine.matchLoanProducts(profile, loanProducts);
  const explainedMatches = await loanExplanationService.explainLoanMatches(rawMatches, req.user.language);

  // Cache onto the most recent snapshot (weekly, by convention) if one exists;
  // otherwise this endpoint can be called standalone without a snapshot.
  await FinancialSnapshot.findOneAndUpdate(
    { userId, periodType: 'weekly' },
    { $set: { loanMatches: stripInternalFields(explainedMatches) } },
    { sort: { periodStart: -1 } }
  );

  return success(res, {
    message: 'Loan eligibility computed',
    data: {
      profile,
      matches: explainedMatches,
    },
  });
});

function stripInternalFields(matches) {
  return matches.map(({ vendorProfile, criteria, reasonCodes, ...rest }) => rest);
}

module.exports = { getLoanProducts, checkEligibility };
