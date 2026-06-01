const express = require('express');
const router = express.Router();
const controller = require('../controllers/cars.controller');
const { verifyToken, verifyRole } = require('../middleware/auth');

router.get('/', verifyToken, controller.getCars);
router.post('/', verifyToken, verifyRole('ADMIN'), controller.addCar);
router.post('/bulk-import', verifyToken, verifyRole('ADMIN'), controller.bulkImport);
router.put('/:id', verifyToken, verifyRole('ADMIN'), controller.updateCar);
router.delete('/:id', verifyToken, verifyRole('ADMIN'), controller.deleteCar);

module.exports = router;
