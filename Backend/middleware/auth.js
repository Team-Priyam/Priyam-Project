import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Authenticate and protect routes
export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");

      // Get user from the token, exclude password
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User not found in system" });
      }

      next();
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
  }
};

// Restrict access only to admins
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Administrator privileges required." });
  }
};
