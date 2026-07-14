const express = require('express');
const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/insights', require('./insightRoutes'));
router.use('/loans', require('./loanRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

// Simple health check — useful for verifying the deployed demo is alive
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'TakaSathi API is running', timestamp: new Date().toISOString() });
});

module.exports = router;
