const vendorAuthMiddleware = (req, res, next) => {
    if (!req.user || !req.user.vendor_id) {
        return res.status(403).json({
            message: "Unauthorized: Vendor access only"
        });
    }

    next();
};

module.exports = vendorAuthMiddleware;
