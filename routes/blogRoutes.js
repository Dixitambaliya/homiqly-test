const express = require("express");
const router = express.Router();

const {
    createBlog,
    updateBlog,
    getBlog,
    getAdminBlogs,
    getBlogSummaries,
    toggleBlogStatus,
    getBlogAdminSummaries
} = require("../controller/blogs");
const { upload, handleUploads } = require("../middleware/upload");

const { authenticationToken } = require("../middleware/authMiddleware");
const multiUpload = upload.any();

// Admin routes
router.post("/create-blogs", multiUpload, handleUploads, authenticationToken, createBlog);
router.put("/blogs/:blog_id", authenticationToken, updateBlog);

// User routes
router.get("/get-blogs-summary", authenticationToken, getBlogSummaries);
router.get("/admin-blogs-summary", authenticationToken, getBlogAdminSummaries);

router.get("/get-blogs/:blog_id", authenticationToken, getBlog);
router.get("/blogs", authenticationToken, getAdminBlogs);

router.patch("/toggle/:blog_id", authenticationToken, toggleBlogStatus);

module.exports = router;
