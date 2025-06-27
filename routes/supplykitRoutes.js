const express = require('express');
const router = express.Router();
const {
    createSupplyKit,
    getAllSupplyKits,
    orderSupplyKit,
    getVendorSupplyKits,
    updateSupplyKitOrderStatus
} = require('../controller/supplykitController');
const { authenticationToken } = require('../middleware/authMiddleware');
const { upload, handleUploads } = require('../middleware/upload');

const multiUpload = upload.any();

// Admin routes
router.post('/create', multiUpload, handleUploads, authenticationToken, createSupplyKit);
router.get('/all', authenticationToken, getAllSupplyKits);
router.put('/order-status/:vendor_kit_id', authenticationToken, updateSupplyKitOrderStatus);

// Vendor routes
router.post('/order', authenticationToken, orderSupplyKit);
router.get('/vendor/orders', authenticationToken, getVendorSupplyKits);

module.exports = router;