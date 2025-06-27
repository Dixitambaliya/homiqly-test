const express = require('express');
const router = express.Router();
const {
    createContractor,
    getAllContractors,
    assignContractorToBooking,
    getContractorBookings
} = require('../controller/contractorController');
const { authenticationToken } = require('../middleware/authMiddleware');
const { upload, handleUploads } = require('../middleware/upload');

const multiUpload = upload.any();

router.post('/create', multiUpload, handleUploads, authenticationToken, createContractor);
router.get('/all', authenticationToken, getAllContractors);
router.post('/assign', authenticationToken, assignContractorToBooking);
router.get('/:contractor_id/bookings', authenticationToken, getContractorBookings);

module.exports = router;