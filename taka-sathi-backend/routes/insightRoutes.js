const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const { generateSummary, getLatestSummary } = require('../controllers/insightController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

router.use(protect);

router.post(
  '/summary',
  [body('periodType').optional().isIn(['daily', 'weekly', 'monthly'])],
  validateRequest,
  generateSummary
);

router.get(
  '/latest',
  [query('periodType').optional().isIn(['daily', 'weekly', 'monthly'])],
  validateRequest,
  getLatestSummary
);

module.exports = router;
