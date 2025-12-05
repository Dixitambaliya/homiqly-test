const jwt = require("jsonwebtoken");

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // attach user
        } catch (err) {
            // token invalid → ignore and continue without user
            req.user = null;
        }
    } else {
        req.user = null; // no token provided
    }

    next();
};

module.exports = { optionalAuth };
