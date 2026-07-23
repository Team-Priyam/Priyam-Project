const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET =
  process.env.JWT_SECRET || "supersecretkey_rural_microfinance_2026";

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      req.tokenData = decoded;
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }

      // Ensure user role is attached from DB or token payload
      if (!req.user.role && decoded.role) {
        req.user.role = decoded.role;
      }

      return next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res
        .status(401)
        .json({ message: "Not authorized, token failed or expired" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }
};

/**
 * Middleware factory to authorize access based on user roles extracted from JWT / req.user.
 * Accepts allowed roles as string arguments (e.g., 'Lender', 'LoanOfficer', 'Admin').
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Extract role directly from JWT payload (req.tokenData.role) or req.user.role
    const userRole =
      (req.tokenData && req.tokenData.role) || (req.user && req.user.role);

    if (!userRole) {
      return res.status(403).json({
        message: "Forbidden: No user role found in token or profile",
      });
    }

    // Normalize roles for comparison (e.g., "loan officer" -> "loanofficer")
    const normalizeRole = (r) =>
      r.toString().toLowerCase().replace(/\s+/g, "");

    const normalizedUserRole = normalizeRole(userRole);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        message: `Forbidden: Access denied. Role '${userRole}' is not authorized to access this resource`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };

