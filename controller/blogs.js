const asyncHandler = require("express-async-handler");
const { db } = require("../config/db");
const sanitizeHtml = require("sanitize-html");

// CREATE BLOG
const createBlog = asyncHandler(async (req, res) => {
    const { content, mainImageStyle, subImageStyle } = req.body;

    if (!content) {
        return res.status(400).json({ message: "content is required" });
    }

    let parsedContent;
    let parsedMainStyle = {};
    let parsedSubStyle = {};

    try {
        parsedContent = typeof content === "string" ? JSON.parse(content) : content;
        parsedMainStyle = mainImageStyle ? JSON.parse(mainImageStyle) : {};
        parsedSubStyle = subImageStyle ? JSON.parse(subImageStyle) : {};
    } catch (e) {
        return res.status(400).json({ message: "Invalid JSON", error: e.message });
    }

    // Firebase uploaded files
    const mainImageUrl = req.uploadedFiles?.mainImage?.[0]?.url || null;
    const subImageUrl = req.uploadedFiles?.subImage?.[0]?.url || null;

    // Final stored JSON
    const cleanContent = {
        html: sanitizeHtml(parsedContent.html || "", {
            allowedTags: [
                'div', 'p', 'h1', 'h2', 'h3',
                'span', 'strong', 'em', 'img',
                'section', 'article'
            ],
            allowedAttributes: {
                '*': ['class', 'id', 'style'],
                img: ['src']
            }
        }),

        css: parsedContent.css || "",

        images: {
            main: {
                url: mainImageUrl,
                style: parsedMainStyle
            },
            sub: {
                url: subImageUrl,
                style: parsedSubStyle
            }
        }
    };


    await db.query(
        `INSERT INTO blogs (content) VALUES (?)`,
        [JSON.stringify(cleanContent)]
    );

    res.status(201).json({
        message: "Blog created successfully"
    });
});

// UPDATE BLOG
const updateBlog = asyncHandler(async (req, res) => {
    const { blog_id } = req.params;
    const { content, mainImageStyle, subImageStyle, mainImageDelete, subImageDelete } = req.body;

    if (!content) {
        return res.status(400).json({ message: "content is required" });
    }

    // Fetch old content
    const [rows] = await db.query(
        `SELECT content FROM blogs WHERE blog_id = ? LIMIT 1`,
        [blog_id]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Blog not found" });
    }

    let existing = JSON.parse(rows[0].content);

    // Parse incoming JSON
    let parsedContent = typeof content === "string" ? JSON.parse(content) : content;
    let parsedMainStyle = mainImageStyle ? JSON.parse(mainImageStyle) : null;
    let parsedSubStyle = subImageStyle ? JSON.parse(subImageStyle) : null;

    // Files
    const newMainImage = req.uploadedFiles?.mainImage?.[0]?.url || null;
    const newSubImage = req.uploadedFiles?.subImage?.[0]?.url || null;

    // FINAL IMAGE BUILDING
    const finalMainImage = {
        url:
            mainImageDelete === "true"
                ? null                              // DELETE
                : newMainImage
                    ? newMainImage                     // REPLACE
                    : existing?.images?.main?.url || null, // KEEP
        style:
            parsedMainStyle !== null
                ? parsedMainStyle                 // UPDATE STYLE
                : existing?.images?.main?.style || {}  // KEEP STYLE
    };

    const finalSubImage = {
        url:
            subImageDelete === "true"
                ? null
                : newSubImage
                    ? newSubImage
                    : existing?.images?.sub?.url || null,
        style:
            parsedSubStyle !== null
                ? parsedSubStyle
                : existing?.images?.sub?.style || {}
    };

    // If deleting an image → also delete style
    if (mainImageDelete === "true") {
        finalMainImage.style = {};
    }
    if (subImageDelete === "true") {
        finalSubImage.style = {};
    }

    // FINAL BLOG JSON
    const cleanContent = {
        html: sanitizeHtml(parsedContent.html || existing.html, {
            allowedTags: false,
            allowedAttributes: false
        }),
        css: parsedContent.css || existing.css,
        images: {
            main: finalMainImage,
            sub: finalSubImage
        }
    };

    // Save
    await db.query(
        `UPDATE blogs SET content = ? WHERE blog_id = ?`,
        [JSON.stringify(cleanContent), blog_id]
    );

    res.status(200).json({
        message: "Blog updated successfully"
    });
});

//Admin GET BLOG SUMMARIES
const getBlogAdminSummaries = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Total blog count
    const [[countResult]] = await db.query(`SELECT COUNT(*) AS total FROM blogs`);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated blogs
    const [rows] = await db.query(`
        SELECT blog_id, content, created_at, is_enabled
        FROM blogs
        ORDER BY blog_id DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);

    const blogs = rows.map(row => {
        const content = JSON.parse(row.content);

        // Extract main image
        const mainImage = content.images?.main?.url || null;

        // Extract title from <h1>
        let title = "Untitled Blog";
        try {
            const match = content.html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (match) {
                title = match[1].trim();
            }
        } catch { }

        return {
            blog_id: row.blog_id,
            title,
            mainImage,
            is_enabled: row.is_enabled, // ⬅ ADDED
            created_at: row.created_at
        };
    });

    res.status(200).json({
        message: "Blog summaries fetched successfully",
        pagination: {
            page,
            limit,
            total,
            totalPages
        },
        blogs
    });
});

//Admin TOGGLE BLOG STATUS
const toggleBlogStatus = asyncHandler(async (req, res) => {
    const { blog_id } = req.params;

    const [[row]] = await db.query(
        `SELECT is_enabled FROM blogs WHERE blog_id = ? LIMIT 1`,
        [blog_id]
    );

    if (!row) {
        return res.status(404).json({ message: "Blog not found" });
    }

    const is_enabled = row.is_enabled ? 0 : 1;

    await db.query(
        `UPDATE blogs SET is_enabled = ? WHERE blog_id = ?`,
        [is_enabled, blog_id]
    );

    res.status(200).json({
        message: "Blog status updated"
    });
});


//GET BLOG SUMMARIES (User Side)
const getBlogSummaries = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Total ENABLED blog count
    const [[countResult]] = await db.query(`
        SELECT COUNT(*) AS total 
        FROM blogs 
        WHERE is_enabled = 1
    `);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // Fetch ONLY enabled blogs
    const [rows] = await db.query(`
        SELECT blog_id, content, created_at 
        FROM blogs
        WHERE is_enabled = 1
        ORDER BY blog_id DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);

    const blogs = rows.map(row => {
        const content = JSON.parse(row.content);

        // Extract main image
        const mainImage = content.images?.main?.url || null;

        // Extract title from <h1>
        let title = "Untitled Blog";
        try {
            const match = content.html.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (match) title = match[1].trim();
        } catch { }

        return {
            blog_id: row.blog_id,
            title,
            mainImage,
            created_at: row.created_at
        };
    });

    res.status(200).json({
        message: "Blog summaries fetched successfully",
        pagination: {
            page,
            limit,
            total,
            totalPages
        },
        blogs
    });
});

// GET BLOG (User Side)
const getBlog = asyncHandler(async (req, res) => {
    const { blog_id } = req.params;

    const [rows] = await db.query(
        `SELECT content FROM blogs WHERE blog_id = ? LIMIT 1`,
        [blog_id]
    );

    if (!rows.length) {
        return res.status(404).json({ message: "Blog not found" });
    }

    const content = JSON.parse(rows[0].content);

    const html = content.html || "";
    const css = content.css || "";
    const images = content.images || {};
    const main = images.main || {};
    const sub = images.sub || {};

    const mainStyleStr = main.style
        ? Object.entries(main.style).map(([k, v]) => `${k}:${v}`).join(";")
        : "";

    const subStyleStr = sub.style
        ? Object.entries(sub.style).map(([k, v]) => `${k}:${v}`).join(";")
        : "";

    // Inject images
    let finalHtml = html;

    if (main.url) {
        finalHtml = finalHtml.replace(
            `id="mainImg"`,
            `src="${main.url}" style="${mainStyleStr}"`
        );
        finalHtml = finalHtml.replace(
            `id='mainImg'`,
            `src="${main.url}" style="${mainStyleStr}"`
        );
    }

    if (sub.url) {
        finalHtml = finalHtml.replace(
            `id="subImg"`,
            `src="${sub.url}" style="${subStyleStr}"`
        );
        finalHtml = finalHtml.replace(
            `id='subImg'`,
            `src="${sub.url}" style="${subStyleStr}"`
        );
    }

    res.status(200).json({
        message: "Blog fetched successfully",
        html: finalHtml,
        css: css,
        images
    });
});


// GET ALL BLOGS (optional)
const getAdminBlogs = asyncHandler(async (req, res) => {
    // 1️⃣ Pagination Input
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 2️⃣ Total count for pagination
    const [[countResult]] = await db.query(`SELECT COUNT(*) AS total FROM blogs`);
    const total = countResult.total;
    const totalPages = Math.ceil(total / limit);

    // 3️⃣ Fetch paginated rows
    const [rows] = await db.query(`
        SELECT blog_id, content, created_at 
        FROM blogs 
        ORDER BY blog_id DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);

    // 4️⃣ Process blogs with image injection
    const blogs = rows.map(row => {
        let content = JSON.parse(row.content);

        const html = content.html || "";
        const css = content.css || "";
        const images = content.images || {};
        const main = images.main || {};
        const sub = images.sub || {};

        const mainStyleStr = main.style
            ? Object.entries(main.style).map(([k, v]) => `${k}:${v}`).join(";")
            : "";

        const subStyleStr = sub.style
            ? Object.entries(sub.style).map(([k, v]) => `${k}:${v}`).join(";")
            : "";

        // Inject images into HTML
        let finalHtml = html;

        if (main.url) {
            finalHtml = finalHtml.replace(
                `id="mainImg"`,
                `src="${main.url}" style="${mainStyleStr}"`
            );
            finalHtml = finalHtml.replace(
                `id='mainImg'`,
                `src="${main.url}" style="${mainStyleStr}"`
            );
        }

        if (sub.url) {
            finalHtml = finalHtml.replace(
                `id="subImg"`,
                `src="${sub.url}" style="${subStyleStr}"`
            );
            finalHtml = finalHtml.replace(
                `id='subImg'`,
                `src="${sub.url}" style="${subStyleStr}"`
            );
        }

        return {
            blog_id: row.blog_id,
            html: finalHtml,
            css: css,
            images: images,
            created_at: row.created_at
        };
    });

    // 5️⃣ Response
    res.status(200).json({
        message: "Blogs fetched successfully",
        pagination: {
            page,
            limit,
            total,
            totalPages
        },
        blogs
    });
});



module.exports = {
    createBlog,
    updateBlog,
    getBlog,
    getBlogSummaries,
    getAdminBlogs,
    toggleBlogStatus,
    getBlogAdminSummaries
};
