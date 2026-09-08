export const adminMiddleware = (req, res, next) => {
  try {

    // Check whether the logged-in user is an admin
    if (!req.user || !req.user.isadmin) {
      return res.status(403).json({
        message: "Access denied. Admin only."
      });
    }

    // User is an admin
    next();

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};