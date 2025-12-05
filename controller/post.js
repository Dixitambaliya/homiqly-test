const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");

const getVendorServices = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    const [rows] = await db.query(
        `
        SELECT DISTINCT 
            st.service_id,
            s.serviceName
        FROM vendor_package_items_flat vpf
        JOIN packages p ON vpf.package_id = p.package_id
        JOIN service_type st ON p.service_type_id = st.service_type_id
        JOIN services s ON s.service_id = st.service_id
        WHERE vpf.vendor_id = ?
        `,
        [vendor_id]
    );

    return res.json({
        vendor_id,
        services: rows
    });
});

const getServiceNames = asyncHandler(async (req, res) => {
    const [rows] = await db.query(
        `
        SELECT DISTINCT
            s.service_id,
            s.serviceName
        FROM posts p
        JOIN services s ON p.service_id = s.service_id
        WHERE p.is_approved = 1   
        ORDER BY s.serviceName ASC
        `
    );

    return res.json({
        total: rows.length,
        services: rows
    });
});


const createPost = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { title, short_description, service_id } = req.body;

    if (!vendor_id || !title || !service_id) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const galleryImages = req.uploadedFiles?.galleryImages?.map(img => img.url) || [];

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [postRes] = await conn.query(
            `
            INSERT INTO posts (vendor_id, service_id, title, shortDescription, is_approved)
            VALUES (?, ?, ?, ?, 0)
            `,
            [vendor_id, service_id, title, short_description]
        );

        const post_id = postRes.insertId;

        for (const imgUrl of galleryImages) {
            await conn.query(
                `INSERT INTO post_images (post_id, image) VALUES (?, ?)`,
                [post_id, imgUrl]
            );
        }

        await conn.commit();

        return res.status(201).json({
            message: "Post submitted for admin approval.",
            post_id
        });

    } catch (err) {
        await conn.rollback();
        console.error("Post creation error:", err);
        return res.status(500).json({ error: "Database error", details: err.message });
    } finally {
        conn.release();
    }
});

const editPost = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { post_id } = req.params;
    const { title, short_description } = req.body; // removed service_id from editable fields

    if (!vendor_id || !post_id) {
        return res.status(400).json({ error: "Missing vendor_id or post_id." });
    }

    // 1️⃣ Check if post exists & belongs to vendor
    const [postRows] = await db.query(
        `SELECT * FROM posts WHERE post_id = ? AND vendor_id = ? LIMIT 1`,
        [post_id, vendor_id]
    );

    if (postRows.length === 0) {
        return res.status(404).json({ error: "Post not found or unauthorized." });
    }

    const galleryImages = req.uploadedFiles?.galleryImages?.map(img => img.url) || [];

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        // 2️⃣ Update only title + shortDescription + reset approval
        await conn.query(
            `
            UPDATE posts
            SET 
                title = COALESCE(?, title),
                shortDescription = COALESCE(?, shortDescription),
                is_approved = 0   
            WHERE post_id = ? AND vendor_id = ?
            `,
            [title, short_description, post_id, vendor_id]
        );

        // 3️⃣ Add new images (old images remain)
        for (const imgUrl of galleryImages) {
            await conn.query(
                `INSERT INTO post_images (post_id, image) VALUES (?, ?)`,
                [post_id, imgUrl]
            );
        }

        await conn.commit();

        return res.status(200).json({
            message: "Post updated successfully. Awaiting admin approval again.",
            post_id
        });

    } catch (err) {
        await conn.rollback();
        console.error("Post update error:", err);
        return res.status(500).json({ error: "Database error", details: err.message });
    } finally {
        conn.release();
    }
});

const getVendorPosts = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;
    const { serviceName } = req.query; // optional filter

    if (!vendor_id) {
        return res.status(400).json({ error: "vendor_id is required" });
    }

    // 1️⃣ Build base query
    let postQuery = `
        SELECT 
            p.post_id,
            p.vendor_id,
            p.service_id,
            s.serviceName,
            p.title,
            p.shortDescription AS short_description,
            p.is_approved,
            p.created_at
        FROM posts p
        JOIN services s ON p.service_id = s.service_id
        WHERE p.vendor_id = ?
    `;

    const params = [vendor_id];

    // 2️⃣ Apply filter if serviceName provided
    if (serviceName) {
        postQuery += ` AND s.serviceName LIKE ? `;
        params.push(`%${serviceName}%`);
    }

    postQuery += ` ORDER BY p.post_id DESC `;

    const [posts] = await db.query(postQuery, params);

    if (posts.length === 0) {
        return res.json({ vendor_id, posts: [] });
    }

    // 3️⃣ Get post IDs
    const postIds = posts.map(p => p.post_id);

    // 4️⃣ Fetch images
    const [images] = await db.query(
        `SELECT post_id,
         image AS galleryImages
         FROM post_images 
         WHERE post_id IN (?)`,
        [postIds]
    );

    // 5️⃣ Fetch likes
    const [likes] = await db.query(
        `
        SELECT 
            post_id, 
            COUNT(*) AS totalLikes 
        FROM post_likes
        WHERE post_id IN (?)
        GROUP BY post_id
        `,
        [postIds]
    );

    const likesMap = {};
    likes.forEach(like => {
        likesMap[like.post_id] = like.totalLikes;
    });

    // 6️⃣ Attach images + likes
    const postsWithExtras = posts.map(post => ({
        ...post,
        galleryImages: images
            .filter(img => img.post_id === post.post_id)
            .map(img => img.galleryImages),
        totalLikes: likesMap[post.post_id] || 0
    }));

    return res.json({
        vendor_id,
        posts: postsWithExtras
    });
});



const getApprovedVendorPosts = asyncHandler(async (req, res) => {
    const vendorName = req.query.vendorName;
    const serviceNameFilter = req.query.serviceName; // OPTIONAL

    if (!vendorName) {
        return res.status(400).json({ error: "vendorName is required" });
    }

    // 1️⃣ Find vendors by name
    const [matchedVendors] = await db.query(
        `
        SELECT 
            v.vendor_id,
            i.name AS vendorName,
            i.profileImage AS vendorImage,
            i.expertise,
            i.aboutMe
        FROM vendors v
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        WHERE i.name LIKE ?
        `,
        [`%${vendorName}%`]
    );

    if (matchedVendors.length === 0) {
        return res.status(404).json({ error: "No vendors found with that name" });
    }

    let selectedVendor = null;
    let vendorPosts = [];

    // 2️⃣ Find the first vendor who actually has approved posts
    for (const vendor of matchedVendors) {
        const [posts] = await db.query(
            `
            SELECT 
                p.post_id,
                s.serviceName,
                p.title,
                p.shortDescription
            FROM posts p
            JOIN services s ON p.service_id = s.service_id
            WHERE p.vendor_id = ?
            AND p.is_approved = 1
            ${serviceNameFilter ? "AND s.serviceName LIKE ?" : ""}
            ORDER BY p.post_id DESC
            `,
            serviceNameFilter
                ? [vendor.vendor_id, `%${serviceNameFilter}%`]
                : [vendor.vendor_id]
        );

        if (posts.length > 0) {
            selectedVendor = vendor;
            vendorPosts = posts;
            break;
        }
    }

    // 3️⃣ If no posts found
    if (!selectedVendor) {
        return res.status(404).json({
            error: "No approved posts found for this vendor and serviceName"
        });
    }

    // ⭐ Vendor Rating Summary
    const [ratingSummary] = await db.query(
        `
        SELECT 
            AVG(rating) AS avgRating,
            COUNT(*) AS ratingCount
        FROM vendor_service_ratings
        WHERE vendor_id = ?
        `,
        [selectedVendor.vendor_id]
    );

    selectedVendor.totalRating = ratingSummary[0].avgRating || 0;
    selectedVendor.ratingCount = ratingSummary[0].ratingCount || 0;

    // ⭐ Vendor Reviews with User Name
    const [allReviews] = await db.query(
        `
    SELECT 
        CONCAT(u.firstName, ' ', u.lastName) AS userName,
        u.profileImage,
        vsr.rating,
        vsr.review,
        vsr.created_at
    FROM vendor_service_ratings vsr
    LEFT JOIN users u ON vsr.user_id = u.user_id
    WHERE vsr.vendor_id = ?
    ORDER BY vsr.created_at DESC
    `,
        [selectedVendor.vendor_id]
    );

    selectedVendor.reviews = allReviews;


    // 4️⃣ Fetch images for posts
    const postIds = vendorPosts.map(p => p.post_id);

    const [images] = await db.query(
        `SELECT post_id, image FROM post_images WHERE post_id IN (?)`,
        [postIds]
    );

    // 5️⃣ Likes for each post
    const [likes] = await db.query(
        `
        SELECT post_id, COUNT(*) AS totalLikes
        FROM post_likes
        WHERE post_id IN (?)
        GROUP BY post_id
        `,
        [postIds]
    );

    const likesMap = {};
    likes.forEach(l => {
        likesMap[l.post_id] = l.totalLikes;
    });

    // 6️⃣ Final merged posts
    const postsWithImages = vendorPosts.map(post => ({
        ...post,
        images: images.filter(img => img.post_id === post.post_id).map(img => img.image),
        totalLikes: likesMap[post.post_id] || 0
    }));

    // 7️⃣ Final response
    return res.json({
        vendor: selectedVendor,
        posts: postsWithImages
    });
});

const getVendorServiceNames = asyncHandler(async (req, res) => {
    const vendorName = req.query.vendorName;

    if (!vendorName) {
        return res.status(400).json({ error: "vendorName is required" });
    }

    // 1️⃣ Get all vendors matching vendorName
    const [vendors] = await db.query(
        `
        SELECT v.vendor_id
        FROM vendors v
        JOIN individual_details i ON v.vendor_id = i.vendor_id
        WHERE i.name LIKE ?
        `,
        [`%${vendorName}%`]
    );

    if (vendors.length === 0) {
        return res.status(404).json({ error: "No vendors found with that name" });
    }

    const vendorIds = vendors.map(v => v.vendor_id);

    // 2️⃣ Get DISTINCT serviceNames from approved posts
    const [services] = await db.query(
        `
        SELECT DISTINCT s.serviceName
        FROM posts p
        JOIN services s ON p.service_id = s.service_id
        WHERE p.vendor_id IN (?) 
        AND p.is_approved = 1
        ORDER BY s.serviceName ASC
        `,
        [vendorIds]
    );

    return res.json({
        vendorName,
        serviceNames: services.map(s => s.serviceName)
    });
});




const getPendingPosts = asyncHandler(async (req, res) => {
    const [posts] = await db.query(
        `
        SELECT 
            p.post_id,
            p.vendor_id,
            s.serviceName,
            p.title,
            p.shortDescription,
            p.is_approved,
            p.created_at
        FROM posts p
        LEFT JOIN services s ON p.service_id = s.service_id
        WHERE p.is_approved = 0
        ORDER BY p.created_at DESC
        `
    );

    if (posts.length === 0) {
        return res.json({ posts: [] });
    }

    // Fetch images for all posts
    const postIds = posts.map(p => p.post_id);

    const [images] = await db.query(
        `SELECT post_id, image FROM post_images WHERE post_id IN (?)`,
        [postIds]
    );

    // Merge images per post
    const postsWithImages = posts.map(post => ({
        ...post,
        images: images.filter(i => i.post_id === post.post_id).map(i => i.image)
    }));

    res.json({
        count: posts.length,
        posts: postsWithImages
    });
});

const approvePost = asyncHandler(async (req, res) => {
    const post_id = req.params.post_id;
    const { is_approved } = req.body;

    if (!post_id) {
        return res.status(400).json({ error: "post_id is required" });
    }

    if (![1, 2].includes(is_approved)) {
        return res.status(400).json({ error: "Invalid status. Use 1 for approve, 2 for reject." });
    }

    const [postRows] = await db.query(
        `SELECT post_id FROM posts WHERE post_id = ? LIMIT 1`,
        [post_id]
    );

    if (postRows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
    }

    await db.query(
        `UPDATE posts SET is_approved = ? WHERE post_id = ?`,
        [is_approved, post_id]
    );

    return res.json({
        message: is_approved === 1 ? "Post approved" : "Post rejected",
    });
});

const getPostSummary = asyncHandler(async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // 1️⃣ Get total post count
    const [[{ total }]] = await db.query(`
        SELECT COUNT(*) AS total FROM posts
    `);

    // 2️⃣ Fetch paginated records
    const [rows] = await db.query(
        `
        SELECT 
            p.post_id,
            p.vendor_id,
            p.title,
            COALESCE(i.name, c.companyName) AS vendorName
        FROM posts p
        LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
        ORDER BY p.post_id DESC
        LIMIT ? OFFSET ?
        `,
        [limit, offset]
    );

    return res.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        count: rows.length,
        posts: rows
    });
});

const getVendorPostSummary = asyncHandler(async (req, res) => {
    const { serviceName } = req.query;

    // 1️⃣ Fetch ONLY vendors who have at least one approved post
    const [vendors] = await db.query(`
        SELECT DISTINCT 
            v.vendor_id,
            i.name AS vendorName,
            i.profileImage,
            i.expertise
        FROM vendors v
        JOIN posts p ON v.vendor_id = p.vendor_id
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        WHERE p.is_approved = 1
    `);

    if (vendors.length === 0) {
        return res.json({ vendors: [] });
    }

    // 2️⃣ Fetch all approved posts + serviceName
    let postsQuery = `
        SELECT 
            p.post_id,
            p.vendor_id,
            p.service_id,
            s.serviceName
        FROM posts p
        JOIN services s ON p.service_id = s.service_id
        WHERE p.is_approved = 1
    `;

    const params = [];

    if (serviceName) {
        postsQuery += ` AND s.serviceName LIKE ? `;
        params.push(`%${serviceName}%`);
    }

    const [posts] = await db.query(postsQuery, params);

    // 3️⃣ Fetch likes
    let likeQuery = `
        SELECT 
            pl.post_id,
            p.vendor_id,
            COUNT(*) AS totalLikes
        FROM post_likes pl
        JOIN posts p ON p.post_id = pl.post_id
        JOIN services s ON p.service_id = s.service_id
        WHERE p.is_approved = 1
    `;

    const likeParams = [];

    if (serviceName) {
        likeQuery += ` AND s.serviceName LIKE ? `;
        likeParams.push(`%${serviceName}%`);
    }

    likeQuery += ` GROUP BY pl.post_id, p.vendor_id`;

    const [likes] = await db.query(likeQuery, likeParams);

    // Build maps
    const vendorLikesMap = {};
    likes.forEach(l => {
        vendorLikesMap[l.vendor_id] = (vendorLikesMap[l.vendor_id] || 0) + l.totalLikes;
    });

    const vendorPostsMap = {};
    posts.forEach(p => {
        if (!vendorPostsMap[p.vendor_id]) vendorPostsMap[p.vendor_id] = [];
        vendorPostsMap[p.vendor_id].push(p);
    });

    // 4️⃣ Build summary output
    const summary = vendors
        .map(vendor => {
            const vPosts = vendorPostsMap[vendor.vendor_id] || [];

            // Apply service filter
            if (serviceName && vPosts.length === 0) return null;

            return {
                vendor_id: vendor.vendor_id,
                name: vendor.vendorName,
                specialty: vendor.expertise,
                likes: vendorLikesMap[vendor.vendor_id] || 0,
                image: vendor.profileImage,
            };
        })
        .filter(v => v !== null);

    return res.json({
        count: summary.length,
        vendors: summary
    });
});


const likePost = asyncHandler(async (req, res) => {
    const post_id = req.params.post_id;
    const user_id = req.user.user_id; // user must be logged in

    if (!post_id || !user_id) {
        return res.status(400).json({ error: "post_id and user_id are required" });
    }

    // 1️⃣ Check post exists & approved
    const [postRows] = await db.query(
        `SELECT post_id FROM posts WHERE post_id = ? AND is_approved = 1`,
        [post_id]
    );

    if (postRows.length === 0) {
        return res.status(404).json({ error: "Post not found or not approved" });
    }

    // 2️⃣ Has the user already liked this post?
    const [liked] = await db.query(
        `SELECT like_id FROM post_likes WHERE user_id = ? AND post_id = ?`,
        [user_id, post_id]
    );

    if (liked.length > 0) {
        return res.status(400).json({ message: "You already liked this post" });
    }

    // 3️⃣ Insert into post_likes
    await db.query(
        `INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)`,
        [user_id, post_id]
    );

    return res.json({
        message: "Post liked successfully"
    });
});






module.exports = {
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
};  