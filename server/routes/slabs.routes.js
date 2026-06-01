const express = require('express');
const router = express.Router();
const controller = require('../controllers/slabs.controller');
const schemesController = require('../controllers/schemes.controller');
const overridesController = require('../controllers/overrides.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

// Slabs endpoints
router.get('/', verifyToken, controller.getSlabs);
router.put('/', verifyToken, verifyRole('ADMIN'), controller.saveSlabs);

// Schemes endpoints
router.get('/schemes', verifyToken, schemesController.getSchemes);
router.post('/schemes', verifyToken, verifyRole('ADMIN'), schemesController.createScheme);
router.put('/schemes/:id', verifyToken, verifyRole('ADMIN'), schemesController.updateScheme);
router.delete('/schemes/:id', verifyToken, verifyRole('ADMIN'), schemesController.deleteScheme);

// Overrides endpoints
router.get('/overrides/:schemeId', verifyToken, overridesController.getOverrides);
router.put('/overrides/:schemeId', verifyToken, verifyRole('ADMIN'), overridesController.saveOverrides);

module.exports = router;
