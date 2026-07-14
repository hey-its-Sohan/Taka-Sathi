/**
 * seed/loanProducts.seed.js
 *
 * Seeds the LoanProduct collection with an illustrative set of Bangladeshi
 * NBFI/bank micro-loan-style products for the hackathon prototype.
 *
 * IMPORTANT : these figures are representative/illustrative,
 * assembled for demo purposes — NOT live-verified lending offers. Both the
 * app and the writeup must disclose this clearly to avoid misrepresenting
 * real financial institutions.
 *
 * Run: npm run seed
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const LoanProduct = require("../models/LoanProduct");
const logger = require("../utils/logger");

const loanProducts = [
  {
    lenderName: "BRAC Bank (example)",
    productName: "Small Business Loan — Easy Start",
    minMonthlyRevenue: 15000,
    minRecordKeepingDays: 90,
    eligibleBusinessTypes: [
      "vendor",
      "retail",
      "service",
      "small_manufacturing",
    ],
    collateralRequired: false,
    interestRateApprox: "9-12% annual",
    minLoanAmount: 20000,
    maxLoanAmount: 500000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "BRAC (NGO/Microfinance) (example)",
    productName: "Progoti Micro-Enterprise Loan",
    minMonthlyRevenue: 8000,
    minRecordKeepingDays: 30,
    eligibleBusinessTypes: ["vendor", "home_based", "retail"],
    collateralRequired: false,
    interestRateApprox: "20-24% flat (typical microfinance range)",
    minLoanAmount: 5000,
    maxLoanAmount: 150000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "ASA (Microfinance) (example)",
    productName: "Small Entrepreneur Loan",
    minMonthlyRevenue: 10000,
    minRecordKeepingDays: 60,
    eligibleBusinessTypes: ["vendor", "retail", "home_based", "other"],
    collateralRequired: false,
    interestRateApprox: "20-25% flat",
    minLoanAmount: 5000,
    maxLoanAmount: 200000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "IDLC Finance (example)",
    productName: "SME Term Loan",
    minMonthlyRevenue: 40000,
    minRecordKeepingDays: 180,
    eligibleBusinessTypes: ["retail", "small_manufacturing", "service"],
    collateralRequired: true,
    interestRateApprox: "11-14% annual",
    minLoanAmount: 100000,
    maxLoanAmount: 2000000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "City Bank (example)",
    productName: "Small Business Easy Loan",
    minMonthlyRevenue: 25000,
    minRecordKeepingDays: 120,
    eligibleBusinessTypes: ["retail", "service", "small_manufacturing"],
    collateralRequired: false,
    interestRateApprox: "10-13% annual",
    minLoanAmount: 50000,
    maxLoanAmount: 1000000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "TMSS (Microfinance) (example)",
    productName: "Nari Uddokta (Women Entrepreneur) Loan",
    minMonthlyRevenue: 6000,
    minRecordKeepingDays: 30,
    eligibleBusinessTypes: ["vendor", "home_based", "retail"],
    collateralRequired: false,
    interestRateApprox: "18-22% flat",
    minLoanAmount: 3000,
    maxLoanAmount: 100000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
  {
    lenderName: "Mutual Trust Bank (example)",
    productName: "MTB Small Business Loan",
    minMonthlyRevenue: 30000,
    minRecordKeepingDays: 150,
    eligibleBusinessTypes: ["retail", "small_manufacturing", "service"],
    collateralRequired: true,
    interestRateApprox: "10.5-13.5% annual",
    minLoanAmount: 100000,
    maxLoanAmount: 1500000,
    sourceNote:
      "Illustrative data for prototype purposes — verify with lender directly.",
  },
];

const run = async () => {
  await connectDB();
  logger.info(`Seeding ${loanProducts.length} loan products...`);

  await LoanProduct.deleteMany({}); // clean slate for repeatable demo seeding
  await LoanProduct.insertMany(loanProducts);

  logger.info("Seed complete.");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  logger.error("Seeding failed:", err);
  process.exit(1);
});
