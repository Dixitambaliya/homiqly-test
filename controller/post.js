const { db } = require("../config/db");
const asyncHandler = require("express-async-handler");
const moment = require("moment");

const getVendorServices = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    const [rows] = await db.query(
        `
        SELECT DISTINCT
            p.item_id,
            p.itemName
        FROM vendor_package_items_flat vpf
        JOIN package_items p ON vpf.package_item_id = p.item_id
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
    const { title, short_description, item_id } = req.body;

    if (!vendor_id || !title || !item_id) {
        return res.status(400).json({ error: "Missing required fields." });
    }

    const galleryImages = req.uploadedFiles?.galleryImages?.map(img => img.url) || [];

    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
        const [postRes] = await conn.query(
            `
            INSERT INTO posts (vendor_id, title, shortDescription, item_id, is_approved)
            VALUES (?, ?, ?, ?, 0)
            `,
            [vendor_id, title, short_description, item_id]
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
            pi.item_id AS service_id,
            pi.itemName AS serviceName,
            p.title,
            p.shortDescription AS short_description,
            p.is_approved,
            p.created_at
        FROM posts p
        JOIN package_items pi ON p.item_id = pi.item_id
        WHERE p.vendor_id = ?
    `;

    const params = [vendor_id];

    // 2️⃣ Apply filter if serviceName provided
    if (serviceName) {
        postQuery += ` AND pi.itemName LIKE ? `;
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

const getVendorPostsByVendorId = asyncHandler(async (req, res) => {
    const vendor_id = req.params.vendor_id;
    const serviceNameFilter = req.query.serviceName; // OPTIONAL

    if (!vendor_id) {
        return res.status(400).json({ error: "vendor_id is required" });
    }

    // 1️⃣ Fetch vendor details
    const [[vendor]] = await db.query(
        `
        SELECT
            v.vendor_id,
            i.name AS vendorName,
            i.profileImage AS vendorImage,
            i.expertise,
            i.aboutMe
        FROM vendors v
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        WHERE v.vendor_id = ?
        `,
        [vendor_id]
    );

    if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
    }

    // 2️⃣ Fetch approved posts
    const [vendorPosts] = await db.query(
        `
        SELECT
            p.post_id,
            pi.itemName AS serviceName,
            p.title,
            p.shortDescription
        FROM posts p
        JOIN package_items pi ON p.item_id = pi.item_id
        WHERE p.vendor_id = ?
        ${serviceNameFilter ? "AND pi.itemName LIKE ?" : ""}
        ORDER BY p.post_id DESC
        `,
        serviceNameFilter
            ? [vendor_id, `%${serviceNameFilter}%`]
            : [vendor_id]
    );

    if (vendorPosts.length === 0) {
        return res.status(200).json({
            error: "No approved posts found for this vendor"
        });
    }
    // 5️⃣ Fetch images for posts
    const postIds = vendorPosts.map(p => p.post_id);

    const [images] = await db.query(
        `SELECT post_id, image FROM post_images WHERE post_id IN (?)`,
        [postIds]
    );

    // 6️⃣ Likes for each post
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

    // 7️⃣ Merge posts with images + likes
    const postsWithImages = vendorPosts.map(post => ({
        ...post,
        images: images.filter(img => img.post_id === post.post_id).map(img => img.image),
        totalLikes: likesMap[post.post_id] || 0
    }));

    // 8️⃣ Final response
    return res.json({
        vendor,
        posts: postsWithImages
    });
});

const getApprovedVendorPosts = asyncHandler(async (req, res) => {
    const vendorName = req.query.vendorName;
    const serviceNameFilter = req.query.serviceName || null;

    // 🆕 detect logged in user
    const user_id = req.user ? req.user.user_id : null;

    if (!vendorName) {
        return res.status(400).json({ error: "vendorName is required" });
    }

    // 1️⃣ Find vendors
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

    // 2️⃣ Find vendor with posts
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

    // ⭐ Vendor Reviews
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

    // 4️⃣ Get post images
    const postIds = vendorPosts.map(p => p.post_id);

    const [images] = await db.query(
        `SELECT post_id, image FROM post_images WHERE post_id IN (?)`,
        [postIds]
    );

    // 5️⃣ Likes count
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
    likes.forEach(l => (likesMap[l.post_id] = l.totalLikes));

    // ⭐⭐⭐ 6️⃣ USER-SPECIFIC LIKE STATUS (IMPORTANT)
    let userLikedMap = {};
    if (user_id) {
        const [userLikes] = await db.query(
            `
            SELECT post_id
            FROM post_likes
            WHERE user_id = ? AND post_id IN (?)
            `,
            [user_id, postIds]
        );

        userLikedMap = userLikes.reduce((map, row) => {
            map[row.post_id] = true;
            return map;
        }, {});
    }

    // 7️⃣ Merge all data
    const postsWithImages = vendorPosts.map(post => ({
        ...post,
        images: images.filter(img => img.post_id === post.post_id).map(img => img.image),
        totalLikes: likesMap[post.post_id] || 0,
        likedByUser: userLikedMap[post.post_id] || false  // ⭐ FINAL FIX
    }));

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
            id.name,
            id.email,
            s.itemName AS serviceName,
            s.itemName AS serviceName,
            p.title,
            p.shortDescription AS short_description,
            p.is_approved,
            p.created_at
        FROM posts p
        LEFT JOIN package_items s ON p.item_id = s.item_id
        JOIN individual_details id ON p.vendor_id = id.vendor_id
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

const deletePost = asyncHandler(async (req, res) => {
    const post_id = req.params.post_id;

    const admin_id = req.user.admin_id

    if (!admin_id) {
        return res.status(401).json({ error: "Not authorized" })
    }

    if (!post_id) {
        return res.status(400).json({ error: "post_id is required" });
    }

    const [postRows] = await db.query(
        `SELECT post_id FROM posts WHERE post_id = ? LIMIT 1`,
        [post_id]
    );

    if (postRows.length === 0) {
        return res.status(404).json({ error: "Post not found" });
    }

    await db.query(
        `DELETE FROM posts WHERE post_id = ?`,
        [post_id]
    );

    return res.json({
        message: "Post Deleted"
    });
});

const getPostSummary = asyncHandler(async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;

    const offset = (page - 1) * limit;

    // 1️⃣ Count unique vendors who have posts
    const [[{ total }]] = await db.query(`
        SELECT COUNT(DISTINCT vendor_id) AS total
        FROM posts
    `);

    // 2️⃣ Get 1 row per vendor
    const [rows] = await db.query(
        `
        SELECT
            v.vendor_id,
            i.profileImage,
            i.email,
            COALESCE(i.name, c.companyName) AS vendorName
        FROM posts p
        LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        LEFT JOIN company_details c ON v.vendor_id = c.vendor_id
        WHERE p.is_approved = '1'
        GROUP BY v.vendor_id
        ORDER BY MAX(p.post_id) DESC
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
        vendors: rows
    });
});


const getVendorFullProfile = asyncHandler(async (req, res) => {
    const { vendor_id } = req.query;

    // optional auth safe check
    const user_id = req.user?.user_id || null;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    // 1️⃣ Basic vendor info
    const [vendorDetails] = await db.query(`
        SELECT
            v.vendor_id,
            i.name,
            i.profileImage,
            i.expertise AS specialty,
            i.aboutMe
        FROM vendors v
        LEFT JOIN individual_details i ON v.vendor_id = i.vendor_id
        WHERE v.vendor_id = ?
    `, [vendor_id]);

    if (vendorDetails.length === 0) {
        return res.status(404).json({ message: "Vendor not found" });
    }

    const vendor = vendorDetails[0];

    // 🆕 INITIALS (first letter)
    const vendorInitial = vendor.name
        ? vendor.name.trim().charAt(0).toUpperCase()
        : "";

    // 2️⃣ Count posts
    const [postCount] = await db.query(`
        SELECT COUNT(*) AS totalPosts
        FROM posts
        WHERE vendor_id = ? AND is_approved = 1
    `, [vendor_id]);

    // 3️⃣ Reviews
    const [reviews] = await db.query(`
        SELECT
            r.rating_id AS rating_id,
            CONCAT(u.firstName, ' ', u.lastName) AS user_name,
            u.profileImage,
            r.rating,
            r.review,
            DATE_FORMAT(r.created_at, '%d %b %Y') AS date
        FROM ratings r
        JOIN users u ON u.user_id = r.user_id
        WHERE r.vendor_id = ?
        ORDER BY r.created_at DESC
    `, [vendor_id]);

    // ⭐ Average rating
    const rating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    // 4️⃣ Expertise (vendor defined)
    const [expertiseRows] = await db.query(`
        SELECT DISTINCT pi.itemName
        FROM vendor_package_items_flat vpf
        JOIN package_items pi ON pi.item_id = vpf.package_item_id
        WHERE vpf.vendor_id = ?
    `, [vendor_id]);

    const expertise = expertiseRows.map(e => e.itemName);

    // 5️⃣ Get approved posts + service items
    const [services] = await db.query(`
        SELECT
            p.post_id,
            p.title AS name,
            pi.image,
            p.shortDescription AS description
        FROM posts p
        JOIN post_images pi ON p.post_id  = pi.post_id
        WHERE p.vendor_id = ?
        AND p.is_approved = 1
    `, [vendor_id]);

    // If vendor has no services
    if (services.length === 0) {
        return res.json({
            vendor_id: vendor.vendor_id,
            vendorName: vendor.name,
            specialty: vendor.specialty,
            vendorInitial,
            profileImage: vendor.profileImage,
            expertise,
            aboutMe: vendor.aboutMe || "",
            rating: Number(rating.toFixed(1)),
            ratingCount: reviews.length,
            totalPosts: postCount[0].totalPosts,
            reviews,
            services: []
        });
    }

    // ⭐ Extract post ids
    const postIds = services.map(s => s.post_id);

    // ⭐ USER SPECIFIC LIKE STATUS
    let userLikedMap = {};
    if (user_id) {
        const [userLikes] = await db.query(
            `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (?)`,
            [user_id, postIds]
        );

        userLikes.forEach(row => {
            userLikedMap[row.post_id] = true;
        });
    }

    // ⭐ Add isLiked flag
    const servicesWithLikes = services.map(s => ({
        ...s,
        isLiked: userLikedMap[s.post_id] || false
    }));

    // ⭐ Final response
    return res.json({
        vendor_id: vendor.vendor_id,
        vendorName: vendor.name,
        specialty: vendor.specialty,
        vendorInitial,
        profileImage: vendor.profileImage,
        expertise,
        aboutMe: vendor.aboutMe || "",
        rating: Number(rating.toFixed(1)),
        ratingCount: reviews.length,
        totalPosts: postCount[0].totalPosts,
        reviews,
        services: servicesWithLikes
    });
});


const getAllApprovedPosts = asyncHandler(async (req, res) => {
    // detect logged in user (optional)
    const user_id = req.user?.user_id || null;

    // 1️⃣ Fetch approved posts (1 per vendor)
    const [posts] = await db.query(`
        SELECT
            post_id,
            title,
            image,
            description,
            created_at,
            vendor_id,
            specialty,
            vendorName,
            profileImage,
            likes
        FROM (
            SELECT
                p.post_id,
                p.title,
                pi.image,
                p.shortDescription AS description,
                p.created_at,
                v.vendor_id,
                i.name AS vendorName,
                i.profileImage,
                i.expertise AS specialty,

                (
                    SELECT COUNT(*)
                    FROM post_likes pl
                    WHERE pl.post_id = p.post_id
                ) AS likes,

                ROW_NUMBER() OVER (PARTITION BY v.vendor_id ORDER BY p.created_at ASC) AS rn
            FROM posts p
            JOIN vendors v ON p.vendor_id = v.vendor_id
            JOIN post_images pi ON pi.post_id = p.post_id
            LEFT JOIN individual_details i ON i.vendor_id = v.vendor_id
            WHERE p.is_approved = 1
        ) AS x
        WHERE x.rn = 1;
    `);

    if (posts.length === 0) {
        return res.json({ count: 0, posts: [] });
    }

    // 🔥 Extract post ids
    const postIds = posts.map(p => p.post_id);

    // 2️⃣ Map for Likes Count (already in posts)
    const likesMap = {};
    posts.forEach(p => (likesMap[p.post_id] = p.likes));

    // 3️⃣ USER-SPECIFIC LIKE STATUS (optional)
    let userLikedMap = {};
    if (user_id) {
        const [userLikes] = await db.query(
            `
            SELECT post_id
            FROM post_likes
            WHERE user_id = ? AND post_id IN (?)
            `,
            [user_id, postIds]
        );

        userLikes.forEach(row => {
            userLikedMap[row.post_id] = true;
        });
    }

    // 4️⃣ Merge likedByUser flag + formatted date + vendor initial
    const formattedPosts = posts.map(post => ({
        ...post,
        date: moment(post.created_at).format("DD MMM YYYY"),

        // 🆕 Vendor Initial (first letter of name)
        vendorInitial: post.vendorName
            ? post.vendorName.trim().charAt(0).toUpperCase()
            : "",

        isLiked: userLikedMap[post.post_id] || false
    }));

    return res.json({
        count: formattedPosts.length,
        posts: formattedPosts
    });
});

const getRendomPosts = asyncHandler(async (req, res) => {
    const { post_id } = req.query;

    // Optional auth (safe)
    const user_id = req.user?.user_id || null;

    if (!post_id) {
        return res.status(400).json({ error: "post_id is required" });
    }

    // 1️⃣ Fetch ALL approved posts
    const [allPosts] = await db.query(`
        SELECT
            p.title AS name,
            pi.image,
            p.shortDescription AS description,
            p.created_at AS date,
            v.vendor_id,
            i.name AS vendorName,
            i.profileImage,
            i.expertise AS specialty,

            (
                SELECT COUNT(*)
                FROM post_likes pl
                WHERE pl.post_id = p.post_id
            ) AS likes,

            p.post_id
        FROM posts p
        JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN post_images pi ON pi.post_id = p.post_id
        LEFT JOIN individual_details i ON i.vendor_id = v.vendor_id
        WHERE p.is_approved = 1
        ORDER BY p.created_at DESC
    `);

    if (allPosts.length === 0) {
        return res.json({ count: 0, posts: [] });
    }

    // ⭐ Extract all post_ids
    const postIds = allPosts.map(p => p.post_id);

    // 2️⃣ USER-SPECIFIC LIKE STATUS
    let userLikedMap = {};
    if (user_id) {
        const [userLikes] = await db.query(
            `
            SELECT post_id
            FROM post_likes
            WHERE user_id = ? AND post_id IN (?)
            `,
            [user_id, postIds]
        );

        userLikes.forEach(row => {
            userLikedMap[row.post_id] = true;
        });
    }

    // 3️⃣ Format date + vendorInitial + isLiked
    const formattedPosts = allPosts.map(post => ({
        ...post,
        date: moment(post.date).format("DD MMM YYYY"),
        vendorInitial: post.vendorName
            ? post.vendorName.trim().charAt(0).toUpperCase()
            : "",
        isLiked: userLikedMap[post.post_id] || false
    }));

    // 4️⃣ Find the target post
    const targetPost = formattedPosts.find(p => p.post_id == post_id);

    if (!targetPost) {
        return res.status(404).json({ error: "Post not found or not approved" });
    }

    // 5️⃣ Remaining posts
    const remainingPosts = formattedPosts.filter(p => p.post_id != post_id);

    // 6️⃣ Target post first
    const finalPosts = [targetPost, ...remainingPosts];

    return res.json({
        count: finalPosts.length,
        posts: finalPosts
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
    const user_id = req.user?.user_id;

    if (!post_id || !user_id) {
        return res.status(400).json({ error: "post_id and user_id are required" });
    }

    // 1️⃣ Check if post exists + approved
    const [[post]] = await db.query(
        `SELECT post_id FROM posts WHERE post_id = ? AND is_approved = 1`,
        [post_id]
    );

    if (!post) {
        return res.status(404).json({ error: "Post not found or not approved" });
    }

    // 2️⃣ Check if already liked
    const [[existingLike]] = await db.query(
        `SELECT like_id FROM post_likes WHERE user_id = ? AND post_id = ?`,
        [user_id, post_id]
    );

    let action = "";

    if (existingLike) {
        // 3️⃣ UNLIKE
        await db.query(
            `DELETE FROM post_likes WHERE like_id = ?`,
            [existingLike.like_id]
        );
        action = "unliked";
    } else {
        // 4️⃣ LIKE
        await db.query(
            `INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)`,
            [user_id, post_id]
        );
        action = "liked";
    }

    // 5️⃣ Fetch updated like count
    const [[likeCount]] = await db.query(
        `
        SELECT COUNT(*) AS totalLikes
        FROM post_likes
        WHERE post_id = ?
        `,
        [post_id]
    );

    return res.json({
        message: `Post ${action} successfully`,
        liked: action === "liked",
    });
});

const getVendorAllApprovedPosts = asyncHandler(async (req, res) => {
    const { vendor_id } = req.query;

    if (!vendor_id) {
        return res.status(400).json({ message: "vendor_id is required" });
    }

    // detect logged-in user
    const user_id = req.user?.user_id || null;

    // 1️⃣ Fetch ALL approved posts of the vendor
    const [posts] = await db.query(`
        SELECT
            p.post_id,
            p.title,
            pi.image,
            p.shortDescription AS description,
            p.created_at,
            v.vendor_id,
            i.name AS vendorName,
            i.profileImage,
            i.expertise AS specialty,

            (
                SELECT COUNT(*)
                FROM post_likes pl
                WHERE pl.post_id = p.post_id
            ) AS likes
        FROM posts p
        LEFT JOIN post_images pi ON pi.post_id = p.post_id
        JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN individual_details i ON i.vendor_id = v.vendor_id
        WHERE p.is_approved = 1
        AND v.vendor_id = ?
        ORDER BY p.created_at DESC
    `, [vendor_id]);

    if (posts.length === 0) {
        return res.json({ count: 0, posts: [] });
    }

    // extract postIds
    const postIds = posts.map(p => p.post_id);

    // 2️⃣ USER-SPECIFIC LIKE STATUS
    let userLikedMap = {};
    if (user_id) {
        const [userLikes] = await db.query(
            `
            SELECT post_id
            FROM post_likes
            WHERE user_id = ? AND post_id IN (?)
        `,
            [user_id, postIds]
        );

        userLikes.forEach(row => {
            userLikedMap[row.post_id] = true;
        });
    }

    // 3️⃣ Format output
    const formatted = posts.map(post => {
        const { created_at, ...rest } = post; // remove created_at

        return {
            ...rest,
            date: moment(created_at).format("DD MMM YYYY"),
            vendorInitial: post.vendorName
                ? post.vendorName.trim().charAt(0).toUpperCase()
                : "",
            isLiked: userLikedMap[post.post_id] || false
        };
    });

    return res.json({
        count: formatted.length,
        posts: formatted
    });
});




module.exports = {
    getVendorServices,
    createPost,
    getAllApprovedPosts,
    getVendorPosts,
    deletePost,
    getApprovedVendorPosts,
    getPendingPosts,
    approvePost,
    getPostSummary,
    getVendorPostSummary,
    likePost,
    editPost,
    getServiceNames,
    getVendorServiceNames,
    getVendorPostsByVendorId,
    getVendorFullProfile,
    getRendomPosts,
    getVendorAllApprovedPosts
};
