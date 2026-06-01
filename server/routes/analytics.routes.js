const express = require('express');
const router = express.Router();
const controller = require('../controllers/analytics.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/detailed', verifyToken, controller.getDetailedAnalytics);
router.post('/simulate', verifyToken, verifyRole('ADMIN'), controller.seedMockSalesData);
router.get('/reports', verifyToken, controller.getReportsAndAudits);

module.exports = router;
