const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      // Free-form but Gemma 4's parse_transaction tool is prompted to prefer these
      enum: [
        'sales',
        'inventory',
        'rent',
        'transport',
        'utilities',
        'wages',
        'loan_repayment',
        'personal',
        'other',
      ],
      default: 'other',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    rawInputText: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['voice', 'manual'],
      default: 'manual',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    voiceProfileId: {
      type: String,
      default: null,
    },
    creatorName: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Fast lookups for "this user's transactions in date range" — the hottest query path
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
