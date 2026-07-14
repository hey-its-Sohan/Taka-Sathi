const mongoose = require("mongoose");

const loanProductSchema = new mongoose.Schema(
  {
    lenderName: {
      type: String,
      required: true,
      trim: true,
    },
    productName: {
      type: String,
      trim: true,
      default: "",
    },
    minMonthlyRevenue: {
      type: Number,
      required: true,
      min: 0,
    },
    minRecordKeepingDays: {
      type: Number,
      required: true,
      min: 0,
    },
    eligibleBusinessTypes: {
      type: [String],
      default: [
        "vendor",
        "retail",
        "small_manufacturing",
        "service",
        "home_based",
        "other",
      ],
    },
    collateralRequired: {
      type: Boolean,
      default: false,
    },
    interestRateApprox: {
      type: String, // e.g. "9-12% annual"
      default: "N/A",
    },
    maxLoanAmount: {
      type: Number,
      default: 0,
    },
    minLoanAmount: {
      type: Number,
      default: 0,
    },
    // Illustrative/informational only
    sourceNote: {
      type: String,
      default:
        "Illustrative data for prototype purposes — verify with lender directly.",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LoanProduct", loanProductSchema);
