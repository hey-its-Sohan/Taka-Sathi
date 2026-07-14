const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  addTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

router.use(protect); // every transaction route requires auth

router.post(
  '/',
  [
    body('rawInputText').optional().isString(),
    body('amount').optional().isNumeric(),
    body('type').optional().isIn(['income', 'expense']),
    body('category')
      .optional()
      .isIn(['sales', 'inventory', 'rent', 'transport', 'utilities', 'wages', 'loan_repayment', 'personal', 'other']),
  ],
  validateRequest,
  addTransaction
);

router.get(
  '/',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validateRequest,
  getTransactions
);

router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
