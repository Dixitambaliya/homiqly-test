const adminAuthMiddleware = (req, res, next) => {
    // If no user or no admin_id → reject
    if (!req.user || !req.user.admin_id) {
        return res.status(403).json({
            message: "Unauthorized"
        });
    }

    // If admin_id exists → allow
    next();
};

module.exports = adminAuthMiddleware;
