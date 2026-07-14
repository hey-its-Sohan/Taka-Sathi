const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[0-9]{10,14}$/, 'Please provide a valid phone number'],
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    businessType: {
      type: String,
      enum: ['vendor', 'retail', 'small_manufacturing', 'service', 'home_based', 'other'],
      default: 'vendor',
    },
    businessStartDate: {
      type: Date,
      default: null,
    },
    location: {
      district: { type: String, default: '' },
      area: { type: String, default: '' },
    },
    language: {
      type: String,
      enum: ['bn', 'en'],
      default: 'bn',
    },
    // --- OTP fields for phone-based auth (simulated for hackathon demo) ---
    otp: {
      code: { type: String, select: false },
      expiresAt: { type: Date, select: false },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// First-ever transaction date is used by the loan eligibility engine
// to compute "record keeping days" — see services/loanEligibilityEngine.js
userSchema.virtual('recordKeepingStartDate').get(function () {
  return this.businessStartDate || this.createdAt;
});

userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
