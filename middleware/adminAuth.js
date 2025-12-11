const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "admin" || !req.user.admin_id) {
        return res.status(403).json({ error: "Access denied." });
    }
    next();
};

module.exports = { adminOnly };
