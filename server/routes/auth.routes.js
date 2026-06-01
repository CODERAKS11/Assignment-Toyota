const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/login', controller.login);
router.get('/me', verifyToken, controller.getMe);

module.exports = router;
