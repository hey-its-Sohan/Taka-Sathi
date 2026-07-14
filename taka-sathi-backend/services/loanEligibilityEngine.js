/**
 * loanEligibilityEngine.js
 *
 * Deterministic rule matching between a vendor's computed financial profile
 * and the hardcoded/seeded LoanProduct dataset. Gemma 4 is used
 * ONLY afterward, to explain these results in plain Bangla — it never decides
 * eligibility itself. This keeps the eligibility logic auditable and testable.
 */

/**
 * @param {Object} profile
 * @param {number} profile.avgMonthlyRevenue
 * @param {number} profile.recordKeepingDays
 * @param {string} profile.businessType
 * @param {Array} loanProducts - array of LoanProduct documents
 * @returns {Array} matches - [{ loanProductId, lenderName, status, daysUntilEligible, reason, criteria }]
 */
function matchLoanProducts(profile, loanProducts) {
  const { avgMonthlyRevenue, recordKeepingDays, businessType } = profile;

  return loanProducts.map((product) => {
    const reasons = [];
    let eligible = true;

    // Check 1: business type
    const businessTypeOk =
      !product.eligibleBusinessTypes ||
      product.eligibleBusinessTypes.length === 0 ||
      product.eligibleBusinessTypes.includes(businessType);
    if (!businessTypeOk) {
      eligible = false;
      reasons.push("business_type_mismatch");
    }

    // Check 2: minimum monthly revenue
    const revenueOk = avgMonthlyRevenue >= product.minMonthlyRevenue;
    if (!revenueOk) {
      eligible = false;
      reasons.push("insufficient_revenue");
    }

    // Check 3: minimum record-keeping duration
    const recordKeepingOk = recordKeepingDays >= product.minRecordKeepingDays;
    if (!recordKeepingOk) {
      eligible = false;
      reasons.push("insufficient_record_history");
    }

    let status = "not_eligible";
    let daysUntilEligible = 0;

    if (eligible) {
      status = "eligible";
    } else if (businessTypeOk && revenueOk && !recordKeepingOk) {
      // The ONLY gap is time — this is the "eligible in X days if trend continues" case
      status = "eligible_in_x_days";
      daysUntilEligible = Math.max(
        0,
        product.minRecordKeepingDays - recordKeepingDays,
      );
    }

    return {
      loanProductId: product._id,
      lenderName: product.lenderName,
      productName: product.productName,
      status,
      daysUntilEligible,
      reasonCodes: reasons, // machine-readable, passed to Gemma 4 as tool-call context
      criteria: {
        minMonthlyRevenue: product.minMonthlyRevenue,
        minRecordKeepingDays: product.minRecordKeepingDays,
        collateralRequired: product.collateralRequired,
        interestRateApprox: product.interestRateApprox,
        maxLoanAmount: product.maxLoanAmount,
      },
      vendorProfile: { avgMonthlyRevenue, recordKeepingDays, businessType },
    };
  });
}

module.exports = { matchLoanProducts };
