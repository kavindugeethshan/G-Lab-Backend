import jwt from "jsonwebtoken";
import User from "../models/Usermodel.js";
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header is missing",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Token is missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.isblocked) {
      return res.status(403).json({
        message: "Your account has been blocked",
      });
    }

    req.user = {
      ...decoded,
      userId: user._id,
      email: user.email,
      isadmin: Boolean(user.isadmin),
      isblocked: Boolean(user.isblocked),
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
