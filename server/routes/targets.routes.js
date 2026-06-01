const express = require('express');
const router = express.Router();
const controller = require('../controllers/targets.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getTargets);
router.put('/', verifyToken, verifyRole('ADMIN'), controller.saveTarget);

module.exports = router;
