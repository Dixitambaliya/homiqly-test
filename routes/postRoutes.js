const express = require('express');
const router = express.Router();

const {
    getVendorServices,
    createPost,
    getVendorPosts,
    getApprovedVendorPosts,
    getPendingPosts,
    approvePost,
    getPostSummary,
    getVendorPostSummary,
    likePost,
    editPost,
    getServiceNames,
    getVendorServiceNames
} = require('../controller/post');

const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware.js")

const multiUpload = upload.any();

router.get('/get-services', authenticationToken, getVendorServices);
router.get('/servicesName', getServiceNames);
router.post('/create-post', multiUpload, handleUploads, authenticationToken, createPost);
router.get('/get-post', authenticationToken, getVendorPosts);

router.put('/edit-post/:post_id', multiUpload, handleUploads, authenticationToken, editPost);

//USER SIDE
router.get('/get-posts', getApprovedVendorPosts);

router.get('/get-pending-request', authenticationToken, getPendingPosts);

router.patch('/approve-post/:post_id', authenticationToken, approvePost);

router.get('/post-summary', authenticationToken, getPostSummary);

//USER SIDE
router.get('/get-summary', getVendorPostSummary);
router.get('/get-service-vendor', getVendorServiceNames);
router.post('/like-post/:post_id', likePost);

module.exports = router;