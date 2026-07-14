const mongoose = require('mongoose');

const loanMatchSchema = new mongoose.Schema(
  {
    loanProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanProduct' },
    lenderName: String,
    status: {
      type: String,
      enum: ['eligible', 'eligible_in_x_days', 'not_eligible'],
      required: true,
    },
    daysUntilEligible: { type: Number, default: 0 },
    reason: { type: String, default: '' }, // plain-Bangla explanation from Gemma 4
  },
  { _id: false }
);

const forecastPointSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    projectedBalance: { type: Number, required: true },
  },
  { _id: false }
);

const financialSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },

    totalIncome: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },

    healthScore: { type: Number, min: 0, max: 100, default: 0 },
    healthScoreExplanation: { type: String, default: '' }, // Gemma-generated Bangla text

    cashflowForecast: { type: [forecastPointSchema], default: [] },
    warningFlag: { type: Boolean, default: false },
    warningMessage: { type: String, default: '' },

    loanMatches: { type: [loanMatchSchema], default: [] },

    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One snapshot per user/period-type/period-start — new generation overwrites the old one
financialSnapshotSchema.index(
  { userId: 1, periodType: 1, periodStart: 1 },
  { unique: true }
);

module.exports = mongoose.model('FinancialSnapshot', financialSnapshotSchema);
