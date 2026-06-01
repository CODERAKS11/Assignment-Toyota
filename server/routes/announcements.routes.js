const express = require('express');
const router = express.Router();
const controller = require('../controllers/announcements.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, controller.getAnnouncements);
router.post('/', verifyToken, controller.createAnnouncement);

module.exports = router;
