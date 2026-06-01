const express = require('express');
const router = express.Router();
const controller = require('../controllers/slabs.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getSlabs);
router.put('/', verifyToken, verifyRole('ADMIN'), controller.saveSlabs);

module.exports = router;
