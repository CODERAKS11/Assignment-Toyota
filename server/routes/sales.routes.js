const express = require('express');
const router = express.Router();
const controller = require('../controllers/sales.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, controller.getSalesLogs);
router.post('/', verifyToken, controller.saveSalesLogs);

module.exports = router;
