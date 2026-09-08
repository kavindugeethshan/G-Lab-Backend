import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        User: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        Products: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },

                name: {
                    type: String,
                    required: true,
                },

                description: {
                    type: String,
                },

                brand: {
                    type: String,
                },

                discount: {
                    type: Number,
                    default: 0,
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
            },
        ],

        Subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        TotalDiscount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        ShippingFee: {
            type: Number,
            required: true,
            min: 0,
            default: 500,
        },

        FinalTotal: {
            type: Number,
            required: true,
            min: 0,
        },

        Diliveryaddress: {
            fullName: {
                type: String,
                default: "",
            },

            phone: {
                type: String,
                default: "",
            },

            addressLine: {
                type: String,
                required: true,
            },

            city: {
                type: String,
                required: true,
            },

            district: {
                type: String,
                default: "",
            },

            province: {
                type: String,
                default: "",
            },

            postalCode: {
                type: String,
                required: true,
            },
        },

        Orderstatus: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Shipped",
                "Delivered",
                "Cancelled",
            ],
            default: "Pending",
        },
        paymentStatus: {
            type: String,
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

        paymentMethod: {
            type: String,
            enum: ["Card", "COD"],
            default: null,
        },

        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            default: null,
        },

        statusHistory: [
            {
                status: {
                    type: String,
                    enum: [
                        "Pending",
                        "Confirmed",
                        "Shipped",
                        "Delivered",
                        "Cancelled",
                    ],
                    required: true,
                },

                changedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ]
    },
    {
        timestamps: true,
    }
);

// Clear cached model if it exists to ensure schema updates like statusHistory are compiled
if (mongoose.models && mongoose.models.Order) {
    delete mongoose.models.Order;
}

const Order = mongoose.model("Order", orderSchema);

export default Order;