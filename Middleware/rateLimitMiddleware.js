import rateLimit from "express-rate-limit";

// Rate limiter for authentication attempts (Login)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts from this IP. Please try again after 15 minutes.",
  },
});

// Rate limiter for OTP verification attempts (preventing brute-force attacks on 6-digit codes)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 verification attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many verification attempts from this IP. Please try again after 15 minutes.",
  },
});

// Rate limiter for generating / resending OTPs (Registration, Resend, Forgot Password)
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 OTP generation requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many verification code requests from this IP. Please try again after 15 minutes.",
  },
});
