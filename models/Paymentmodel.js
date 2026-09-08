import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        Order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
        },

        User: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            required: true,
            default: "LKR",
            enum: ["LKR"],
        },

        method: {
            type: String,
            required: true,
            enum: ["Card", "COD"],
        },

        gateway: {
            type: String,
            required: true,
            enum: ["PayHere", "COD"],
        },

        transactionId: {
            type: String,
            unique: true,
            sparse: true,
        },

        status: {
            type: String,
            required: true,
            enum: [
                "Pending",
                "Processing",
                "Paid",
                "Failed",
                "RefundPending",
                "Refunded",
            ],
            default: "Pending",
        },

        paidAt: {
            type: Date,
            default: null,
        },

        refundedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;