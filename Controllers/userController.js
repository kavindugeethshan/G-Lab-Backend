import User from "../models/Usermodel.js";
import PendingUser from "../models/PendingUserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail, generateOtpEmailHtml } from "../utils/sendEmail.js";
import PasswordReset from "../models/PasswordResetModel.js";
import crypto from "crypto";


// Create user function
export const createUser = async (req, res) => {
  try {
    console.log("[REGISTER] 1 - createUser started");

    const { email, firstname, lastname, phone, password, Image } = req.body;

    // Validate email
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Validate first name
    if (!firstname || typeof firstname !== "string") {
      return res.status(400).json({
        message: "First name is required",
      });
    }

    if (firstname.trim().length < 2 || firstname.trim().length > 50) {
      return res.status(400).json({
        message: "First name must be between 2 and 50 characters",
      });
    }

    // Validate last name
    if (!lastname || typeof lastname !== "string") {
      return res.status(400).json({
        message: "Last name is required",
      });
    }

    if (lastname.trim().length < 2 || lastname.trim().length > 50) {
      return res.status(400).json({
        message: "Last name must be between 2 and 50 characters",
      });
    }

    // Validate phone number
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({
        message: "Mobile / Phone number is required",
      });
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        message: "Mobile / Phone number must be exactly 10 digits (e.g. 0771234567)",
      });
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and contain uppercase, lowercase, and a number",
      });
    }

    // Check existing user
    console.log("[REGISTER] 2 - checking existing user");

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    console.log("[REGISTER] 3 - existing user check completed");

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // Hash password
    const saltRounds = 12;

    console.log("[REGISTER] 4 - starting password hash");

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log("[REGISTER] 5 - password hash completed");

    // Generate cryptographically secure OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const otpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Save pending user
    console.log("[REGISTER] 6 - creating pending user");

    await PendingUser.findOneAndDelete({
      email: cleanEmail,
    });

    await PendingUser.create({
      email: cleanEmail,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      phone: cleanPhone,
      password: hashedPassword,
      Image,
      emailverificationotp: hashedOtp,
      emailverificationotpexpires: otpExpires,
      otpAttempts: 0,
      lastOtpSentAt: new Date(),
    });

    console.log("[REGISTER] 7 - pending user created");

    // Create email transporter & Send OTP email in background
    console.log("[REGISTER] 8 - sending OTP email");

    sendEmail({
      to: cleanEmail,
      subject: "G-Lab Email Verification Code",
      text: `Your G-Lab verification code is: ${otp}. This code expires in 10 minutes.`,
      html: generateOtpEmailHtml(
        "Email Verification Code",
        otp,
        `Welcome to G-Lab, ${firstname}! Please use the verification code below to complete your registration:`
      ),
    })
      .then((data) => {
        console.log(
          `[REGISTER] 11 - OTP email sent successfully to ${cleanEmail}`
        );
      })
      .catch((emailError) => {
        console.error(
          "[REGISTER] OTP email send error:",
          emailError
        );
      });

    // Respond immediately
    console.log("[REGISTER] 12 - sending response");

    return res.status(201).json({
      message: "Verification code sent to your email.",
      email: cleanEmail,
    });

  } catch (err) {
    console.error("[REGISTER] createUser error:", err);

    return res.status(500).json({
      message: err.message,
    });
  }
};

//----------------------------------------------------------------------------
// Login user function
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email
    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "Password is required",
      });
    }

    // Clean email
    const cleanEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await User.findOne({
      email: cleanEmail,
    });

    // Check whether user exists
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if user is blocked
    if (user.isblocked) {
      return res.status(403).json({
        message: "Your account has been blocked. Please contact support.",
        errorType: "ACCOUNT_BLOCKED",
      });
    }

    // Compare entered password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    // Check password
    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }
    //create jwt token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        isadmin: user.isadmin,
        isblocked: user.isblocked,
        image: user.Image,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Login successful
    res.status(200).json({
      message: "Login successful",
      user: userResponse,
      token,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

//----------------------------------------------------------------------------
//Get user profile function
export async function getprofile(req, res) {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      message: "User profile fetched successfully",
      user
    })
  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    })
  }
}
//-------------------------------------------------------------------------
//Update user profile function
export const updateprofule = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, image, Image } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    if (firstname !== undefined) {
      if (typeof firstname !== "string") {
        return res.status(400).json({
          message: "First name must be a string",
        });
      }

      const cleanFirstname = firstname.trim();

      if (cleanFirstname.length < 2 || cleanFirstname.length > 50) {
        return res.status(400).json({
          message: "First name must be between 2 and 50 characters",
        });
      }

      user.firstname = cleanFirstname;
    }

    if (lastname !== undefined) {
      if (typeof lastname !== "string") {
        return res.status(400).json({
          message: "Last name must be a string",
        });
      }

      const cleanLastname = lastname.trim();

      if (cleanLastname.length < 2 || cleanLastname.length > 50) {
        return res.status(400).json({
          message: "Last name must be between 2 and 50 characters",
        });
      }

      user.lastname = cleanLastname;
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Phone number must be a string",
        });
      }

      const cleanPhone = phone.replace(/\D/g, "");

      if (cleanPhone && cleanPhone.length !== 10) {
        return res.status(400).json({
          message: "Mobile / Phone number must be exactly 10 digits (e.g. 0771234567)",
        });
      }

      user.phone = cleanPhone;

      // Keep address.phone synced if empty
      if (!user.address) user.address = {};
      if (!user.address.phone || user.address.phone === "") {
        user.address.phone = cleanPhone;
      }
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: req.user.userId },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Email is already in use",
        });
      }

      user.email = cleanEmail;
    }

    const profilePic = image !== undefined ? image : Image;
    if (profilePic !== undefined) {
      if (typeof profilePic !== "string") {
        return res.status(400).json({
          message: "Profile image must be a string URL",
        });
      }

      const trimmedPic = profilePic.trim();
      if (trimmedPic) {
        const lowerPic = trimmedPic.toLowerCase();
        // Disallow dangerous URI schemes
        if (
          lowerPic.startsWith("javascript:") ||
          lowerPic.startsWith("data:") ||
          lowerPic.startsWith("vbscript:") ||
          lowerPic.startsWith("file:")
        ) {
          return res.status(400).json({
            message: "Security Alert: Prohibited or suspicious image URL protocol detected.",
          });
        }

        try {
          const parsed = new URL(trimmedPic);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return res.status(400).json({
              message: "Image URL must use http or https protocol.",
            });
          }

          // Disallow dangerous extensions in the path
          const dangerousExts = /\.(php|phtml|html|htm|js|exe|bat|cmd|sh|py|pl|vbs|svg|cgi|asp|aspx|dll|scr)(\?|$)/i;
          if (dangerousExts.test(parsed.pathname)) {
            return res.status(400).json({
              message: "Security Alert: Dangerous or executable file extension detected in image URL.",
            });
          }
        } catch (_) {
          return res.status(400).json({
            message: "Invalid image URL format.",
          });
        }

        user.Image = trimmedPic;
      } else {
        user.Image = "";
      }
    }

    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: "user profile updated successfully",
      user: userResponse
    });

  } catch (err) {
    res.status(500).json({
      message: "server error",
      error: err.message
    })
  }
}
//---------------------------------------------------------------------
//change password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required"
      });
    }
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const isPasswordvalid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordvalid) {
      return res.status(400).json({
        message: "Incorrect current password"
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    await user.save();
    res.status(200).json({
      message: "Password changed successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    })
  }
}

//---------------------------------------------------------------------------
//Delete  own account
export const deleteOwnAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isadmin) {
      return res.status(403).json({
        message: "Admin accounts cannot be deleted",
      });
    }

    await User.findByIdAndDelete(req.user.userId);

    res.status(200).json({
      message: "Account deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};
//-----------------------------------------------------------------
//// Update user address
export const updateAddress = async (req, res) => {
  try {
    const addressData = req.body.address || req.body;
    const { addressLine, city, district, province, postalCode, fullName, phone } = addressData;

    // Find logged-in user
    const user = await User.findById(req.user.userId);

    // Check whether user exists
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    if (!addressLine || typeof addressLine !== "string") {
      return res.status(400).json({
        message: "Address line is required",
      });
    }

    if (!city || typeof city !== "string") {
      return res.status(400).json({
        message: "City is required",
      });
    }

    if (!district && !province) {
      return res.status(400).json({
        message: "District or province is required",
      });
    }

    if (!postalCode || typeof postalCode !== "string") {
      return res.status(400).json({
        message: "Postal code is required",
      });
    }

    const cleanDistrict = (district || province || "").trim();
    const cleanProvince = (province || district || "").trim();

    // Update address
    user.address = {
      fullName: (fullName || user.address?.fullName || `${user.firstname} ${user.lastname}`).trim(),
      phone: (phone || user.address?.phone || user.phone || "").trim(),
      addressLine: addressLine.trim(),
      city: city.trim(),
      district: cleanDistrict,
      province: cleanProvince,
      postalCode: postalCode.trim(),
    };

    if (phone && !user.phone) {
      user.phone = phone.trim();
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      message: "Address updated successfully",
      address: user.address,
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

//--------------------------------------------------------------------------------
// Resend OTP for Pending User
// Resend OTP for Pending User
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is already verified in main collection
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    const pendingUser = await PendingUser.findOne({ email: cleanEmail });
    if (!pendingUser) {
      return res.status(404).json({
        message: "Pending registration not found. Please sign up again.",
      });
    }

    // Cooldown: enforce 60 seconds minimum between OTP resends
    if (pendingUser.lastOtpSentAt && (Date.now() - new Date(pendingUser.lastOtpSentAt).getTime() < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(pendingUser.lastOtpSentAt).getTime())) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
      });
    }

    // Generate cryptographically secure OTP and hash it before storing
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    pendingUser.emailverificationotp = hashedOtp;
    pendingUser.emailverificationotpexpires = otpExpires;
    pendingUser.otpAttempts = 0; // Reset failed attempts on fresh OTP
    pendingUser.lastOtpSentAt = new Date();
    await pendingUser.save();

    sendEmail({
      to: cleanEmail,
      subject: "G-Lab Email Verification Code",
      text: `Your G-Lab verification code is: ${otp}. This code expires in 10 minutes.`,
      html: generateOtpEmailHtml(
        "Resent Email Verification Code",
        otp,
        "Here is your new verification code to complete your G-Lab email verification:"
      ),
    }).catch((emailError) => {
      console.error("[RESEND_OTP] Email send error:", emailError);
    });

    res.status(200).json({
      message: "OTP resent successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

//--------------------------------------------------------------------------------
// Verify Email & Create User in main collection ONLY upon OTP match
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Search in PendingUser model
    const pendingUser = await PendingUser.findOne({ email: cleanEmail });

    if (!pendingUser) {
      // Check if user already exists in main collection
      const verifiedUser = await User.findOne({ email: cleanEmail });
      if (verifiedUser) {
        return res.status(400).json({
          message: "Email is already verified",
        });
      }
      return res.status(404).json({
        message: "Pending registration not found or expired. Please sign up again.",
      });
    }

    // Check expiration
    if (new Date() > pendingUser.emailverificationotpexpires) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new code.",
      });
    }

    // Check attempt lockout (max 5 failed attempts)
    if ((pendingUser.otpAttempts || 0) >= 5) {
      await PendingUser.deleteOne({ _id: pendingUser._id });
      return res.status(429).json({
        message: "Too many failed attempts. For security, your registration has been cancelled. Please register again.",
      });
    }

    // Compare OTP securely using bcrypt or timing comparison
    const cleanOtp = otp.toString().trim();
    let isOtpValid = false;

    if (pendingUser.emailverificationotp.startsWith("$2")) {
      isOtpValid = await bcrypt.compare(cleanOtp, pendingUser.emailverificationotp);
    } else {
      isOtpValid = pendingUser.emailverificationotp === cleanOtp;
    }

    if (!isOtpValid) {
      pendingUser.otpAttempts = (pendingUser.otpAttempts || 0) + 1;
      await pendingUser.save();

      const remainingAttempts = 5 - pendingUser.otpAttempts;
      if (remainingAttempts <= 0) {
        await PendingUser.deleteOne({ _id: pendingUser._id });
        return res.status(429).json({
          message: "Too many failed attempts. For security, your registration session has been cancelled. Please register again.",
        });
      }

      return res.status(400).json({
        message: `Invalid OTP. You have ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // ONLY NOW create the real User document in main collection
    const createdUser = await User.create({
      email: pendingUser.email,
      firstname: pendingUser.firstname,
      lastname: pendingUser.lastname,
      phone: pendingUser.phone || "",
      address: {
        phone: pendingUser.phone || "",
        fullName: `${pendingUser.firstname} ${pendingUser.lastname}`.trim()
      },
      password: pendingUser.password, // Already hashed
      Image: pendingUser.Image,
      isemailverified: true,
    });

    // Delete temporary registration from PendingUser collection
    await PendingUser.deleteOne({ _id: pendingUser._id });

    const userResponse = createdUser.toObject();
    delete userResponse.password;

    return res.status(200).json({
      message: "Email verified successfully! Your account has been created.",
      user: userResponse
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};


//--------------------------------------------------------------------------------
// FORGOT PASSWORD - Step 1: Send Reset OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // Generic response to prevent account enumeration
    const genericResponse = {
      message: "If an account with that email exists, a password reset code has been sent.",
    };

    const user = await User.findOne({ email: cleanEmail });

    // If user does not exist, return generic 200 without sending email or creating record
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Enforce 60-second cooldown between reset requests
    const existingReset = await PasswordReset.findOne({ email: cleanEmail });
    if (existingReset && existingReset.lastSentAt && (Date.now() - new Date(existingReset.lastSentAt).getTime() < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - new Date(existingReset.lastSentAt).getTime())) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting another password reset code.`,
      });
    }

    // Generate cryptographically secure OTP and hash it
    const otp = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.findOneAndDelete({
      email: cleanEmail,
    });

    await PasswordReset.create({
      email: cleanEmail,
      otp: hashedOtp,
      expiresAt,
      verified: false,
      attempts: 0,
      lastSentAt: new Date(),
    });

    // Send email asynchronously in background
    sendEmail({
      to: cleanEmail,
      subject: "G-Lab Password Reset Code",
      text: `Your G-Lab password reset code is: ${otp}. This code expires in 10 minutes.`,
      html: generateOtpEmailHtml(
        "Password Reset Request",
        otp,
        "We received a request to reset your G-Lab account password. Use the verification code below to continue:"
      ),
    }).catch((err) => console.error("Forgot password email send error:", err.message));

    return res.status(200).json(genericResponse);

  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Failed to process password reset request.",
    });
  }
};

//--------------------------------------------------------------------------------
// FORGOT PASSWORD - Step 2: Verify Reset OTP
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !otp) {
      return res.status(400).json({
        message: "Email and OTP code are required",
      });
    }

    const resetRecord = await PasswordReset.findOne({ email: cleanEmail });

    if (!resetRecord) {
      return res.status(404).json({
        message: "Reset request not found or expired. Please request a new code.",
      });
    }

    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new code.",
      });
    }

    // Attempt limit check (max 5 attempts)
    if ((resetRecord.attempts || 0) >= 5) {
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      return res.status(429).json({
        message: "Too many failed attempts. For security, this reset code has been invalidated. Please request a new code.",
      });
    }

    const cleanOtp = otp.toString().trim();
    let isOtpValid = false;

    if (resetRecord.otp.startsWith("$2")) {
      isOtpValid = await bcrypt.compare(cleanOtp, resetRecord.otp);
    } else {
      isOtpValid = resetRecord.otp === cleanOtp;
    }

    if (!isOtpValid) {
      resetRecord.attempts = (resetRecord.attempts || 0) + 1;
      await resetRecord.save();

      const remainingAttempts = 5 - resetRecord.attempts;
      if (remainingAttempts <= 0) {
        await PasswordReset.deleteOne({ _id: resetRecord._id });
        return res.status(429).json({
          message: "Too many failed attempts. For security, this reset code has been invalidated. Please request a new code.",
        });
      }

      return res.status(400).json({
        message: `Invalid OTP code. You have ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    resetRecord.verified = true;
    resetRecord.attempts = 0; // Reset attempts upon successful verification
    await resetRecord.save();

    return res.status(200).json({
      message: "OTP verified successfully. You can now enter your new password.",
    });
  } catch (error) {
    console.error("Verify reset OTP error:", error);
    return res.status(500).json({
      message: "Failed to verify OTP.",
    });
  }
};

//--------------------------------------------------------------------------------
// FORGOT PASSWORD - Step 3: Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = email?.trim().toLowerCase();

    if (!cleanEmail || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP, and new password are required",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long and contain uppercase, lowercase, and a number",
      });
    }

    const resetRecord = await PasswordReset.findOne({ email: cleanEmail });

    if (!resetRecord) {
      return res.status(404).json({
        message: "Reset request not found or expired. Please request a new code.",
      });
    }

    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({
        message: "Reset session expired. Please request a new code.",
      });
    }

    // Verify OTP matching
    const cleanOtp = otp.toString().trim();
    let isOtpValid = false;

    if (resetRecord.otp.startsWith("$2")) {
      isOtpValid = await bcrypt.compare(cleanOtp, resetRecord.otp);
    } else {
      isOtpValid = resetRecord.otp === cleanOtp;
    }

    if (!resetRecord.verified || !isOtpValid) {
      return res.status(400).json({
        message: "Please verify your OTP code before resetting password.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    user.password = hashedPassword;
    await user.save();

    // Delete the reset record so it cannot be reused (one-time reset token)
    await PasswordReset.deleteOne({ _id: resetRecord._id });

    return res.status(200).json({
      message: "Password reset successfully! Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      message: "Failed to reset password.",
    });
  }
};
