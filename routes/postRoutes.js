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
    deletePost,
    getServiceNames,
    getVendorPostsByVendorId,
    getVendorServiceNames,
    getVendorFullProfile,
    getAllApprovedPosts,
    getVendorAllApprovedPosts,
    getRendomPosts
} = require('../controller/post');

const { upload, handleUploads } = require("../middleware/upload");
const { authenticationToken } = require("../middleware/authMiddleware.js")
const { optionalAuth } = require("../middleware/optionalAuth.js")

const multiUpload = upload.any();

//VENDOR
router.get('/get-post', authenticationToken, getVendorPosts);
router.get('/get-services', authenticationToken, getVendorServices);
router.post('/create-post', multiUpload, handleUploads, authenticationToken, createPost);
router.put('/edit-post/:post_id', multiUpload, handleUploads, authenticationToken, editPost);


//ADMIN
router.get('/get-pending-request', authenticationToken, getPendingPosts);
router.patch('/approve-post/:post_id', authenticationToken, approvePost);
router.delete('/delete-post/:post_id', authenticationToken, deletePost);
router.get('/post-summary', authenticationToken, getPostSummary);
router.get('/get-post-details/:vendor_id', authenticationToken, getVendorPostsByVendorId);

//USER
// router.get('/servicesName', getServiceNames);
// router.get('/get-summary', getVendorPostSummary);
// router.get('/get-service-vendor', getVendorServiceNames);
// router.get('/get-posts', optionalAuth, getApprovedVendorPosts);


router.get('/all-posts', optionalAuth, getAllApprovedPosts);
router.get('/all-vendor-post', optionalAuth, getVendorAllApprovedPosts);
router.get('/vendors-posts', optionalAuth, getVendorFullProfile);
router.post('/like-post/:post_id', authenticationToken, likePost);
router.get('/random-posts', getRendomPosts);

module.exports = router;
