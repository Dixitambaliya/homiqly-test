const jwt = require("jsonwebtoken");

const authenticationToken = (req, res, next) => {
  const authHeader  = req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided" });
  }

  const token = authHeader.split(" ")[1]; // Extract the actual token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Set user type for easier identification
    if (decoded.employee_id) {
      req.user.userType = 'employee';
    } else if (decoded.vendor_id) {
      req.user.userType = 'vendor';
    } else if (decoded.admin_id) {
      req.user.userType = 'admin';
    } else if (decoded.user_id) {
      req.user.userType = 'user';
    }
    
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = { authenticationToken };
