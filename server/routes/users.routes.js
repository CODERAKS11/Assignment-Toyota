const express = require('express');
const router = express.Router();
const controller = require('../controllers/users.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, verifyRole('ADMIN'), controller.getOfficers);
router.post('/', verifyToken, verifyRole('ADMIN'), controller.createOfficer);
router.put('/:id', verifyToken, verifyRole('ADMIN'), controller.updateOfficer);
router.put('/:id/status', verifyToken, verifyRole('ADMIN'), controller.toggleOfficerStatus);

module.exports = router;
