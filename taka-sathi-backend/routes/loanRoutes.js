const express = require('express');
const router = express.Router();

const { getLoanProducts, checkEligibility } = require('../controllers/loanController');
const { protect } = require('../middleware/authMiddleware');

router.get('/products', protect, getLoanProducts);
router.post('/check-eligibility', protect, checkEligibility);

module.exports = router;
