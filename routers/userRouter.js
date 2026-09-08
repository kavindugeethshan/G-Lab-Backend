import express from "express";
import { createUser, verifyEmail, resendOTP, loginUser, getprofile, updateprofule, changePassword, deleteOwnAccount, updateAddress, forgotPassword, verifyResetOtp, resetPassword } from "../Controllers/userController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { authLimiter, otpRequestLimiter, otpVerifyLimiter } from "../Middleware/rateLimitMiddleware.js";

const userRouter = express.Router();


// Public routes with targeted rate limiters
userRouter.post("/create", otpRequestLimiter, createUser);
userRouter.post("/verify-email", otpVerifyLimiter, verifyEmail);
userRouter.post("/resend-otp", otpRequestLimiter, resendOTP);
userRouter.post("/login", authLimiter, loginUser);
userRouter.post("/forgot-password", otpRequestLimiter, forgotPassword);
userRouter.post("/verify-reset-otp", otpVerifyLimiter, verifyResetOtp);
userRouter.post("/reset-password", otpVerifyLimiter, resetPassword);


// Authentication middleware
userRouter.use(authMiddleware);
// Protected routes
userRouter.get("/profile", getprofile);
userRouter.put("/profile", updateprofule);
userRouter.put("/change-password", changePassword);
userRouter.delete("/delete-account", deleteOwnAccount);
userRouter.put("/address", updateAddress);

export default userRouter;