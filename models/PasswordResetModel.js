import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        otp: {
            type: String,
            required: true,
        },

        expiresAt: {
            type: Date,
            required: true,
        },

        verified: {
            type: Boolean,
            default: false,
        },

        attempts: {
            type: Number,
            default: 0,
        },

        lastSentAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const PasswordReset =
    mongoose.models.PasswordReset ||
    mongoose.model("PasswordReset", passwordResetSchema);

export default PasswordReset;