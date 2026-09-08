import mongoose from "mongoose";
import Order from "../models/Ordermodel.js";
import Payment from "../models/Paymentmodel.js";
import Product from "../models/Productmodel.js";
import { generatePayHereHash, verifyPayHereNotifyHash } from "../utils/payhere.js";



export const createPayment = async (req, res) => {
    try {
        const { orderId } = req.body;

        // 1. Validate orderId
        if (!orderId) {
            return res.status(400).json({
                message: "Order ID is required",
            });
        }

        // 2. Get authenticated user
        const userId = req.user.userId;

        // 3. Find order
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        // 4. Check order ownership
        if (order.User.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not allowed to pay for this order",
            });
        }

        // 5. Check order status
        if (order.Orderstatus !== "Pending") {
            return res.status(400).json({
                message: "This order cannot be paid",
            });
        }

        // 6. Check existing active payment
        const existingPayment = await Payment.findOne({
            Order: order._id,
            status: {
                $in: ["Pending", "Processing", "Paid"],
            },
        });

        if (existingPayment) {
            return res.status(400).json({
                message: "Payment already exists for this order",
                paymentId: existingPayment._id,
                status: existingPayment.status,
            });
        }

        // 7. Create payment using backend order total
        const payment = await Payment.create({
            Order: order._id,
            User: order.User,
            amount: order.FinalTotal,
            currency: "LKR",
            method: "Card",
            gateway: "PayHere",
            status: "Pending",
        });

        // Generate PayHere hash
        const hash = generatePayHereHash(
            process.env.PAYHERE_MERCHANT_ID,
            payment.Order.toString(),
            payment.amount,
            payment.currency,
            process.env.PAYHERE_MERCHANT_SECRET
        );

        // 8. Link payment to order
        order.paymentId = payment._id;
        order.paymentStatus = "Pending";
        order.paymentMethod = "Card";

        await order.save();

        // 9. Return safe response
        return res.status(201).json({
            message: "Payment created successfully",
            payment: {
                id: payment._id,
                orderId: payment.Order,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                gateway: payment.gateway,
                status: payment.status,
                merchantId: process.env.PAYHERE_MERCHANT_ID,
                hash: hash,
                notifyUrl: process.env.PAYHERE_NOTIFY_URL || `${req.protocol}://${req.get("host")}/payments/notify`,
            },
        });

    } catch (error) {
        console.error("Create payment error:", error);

        return res.status(500).json({
            message: "Failed to create payment",
        });
    }
};

export const getPaymentDetails = async (req, res) => {
    try {
        const paymentId = req.params.paymentId || req.params.id;
        const userId = req.user.userId;

        // 1. Validate paymentId format
        if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
            return res.status(400).json({ message: "Invalid payment ID format" });
        }

        // 2. Find payment and populate Order and User
        const payment = await Payment.findById(paymentId)
            .populate("Order")
            .populate("User", "firstname lastname email address");

        if (!payment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // 3. Verify payment ownership
        const paymentUserId = payment.User._id ? payment.User._id.toString() : payment.User.toString();
        if (paymentUserId !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized access to payment" });
        }

        const order = payment.Order;
        if (!order) {
            return res.status(404).json({ message: "Associated order not found" });
        }

        // 4. Generate PayHere hash for checkout (backend only)
        const hash = generatePayHereHash(
            process.env.PAYHERE_MERCHANT_ID,
            order._id.toString(),
            payment.amount,
            payment.currency,
            process.env.PAYHERE_MERCHANT_SECRET
        );

        // 5. Return safe payment object
        return res.status(200).json({
            message: "Payment details retrieved successfully",
            payment: {
                id: payment._id,
                orderId: order._id,
                amount: payment.amount,
                currency: payment.currency,
                method: payment.method,
                gateway: payment.gateway,
                status: payment.status,
                merchantId: process.env.PAYHERE_MERCHANT_ID,
                hash: hash,
                notifyUrl: process.env.PAYHERE_NOTIFY_URL || `${req.protocol}://${req.get("host")}/payments/notify`,
                customer: {
                    first_name: order.Diliveryaddress?.fullName ? order.Diliveryaddress.fullName.split(" ")[0] : (payment.User.firstname || "Customer"),
                    last_name: order.Diliveryaddress?.fullName ? (order.Diliveryaddress.fullName.split(" ").slice(1).join(" ") || payment.User.lastname || "User") : (payment.User.lastname || "User"),
                    full_name: order.Diliveryaddress?.fullName || `${payment.User.firstname || ""} ${payment.User.lastname || ""}`.trim() || "Customer User",
                    email: payment.User.email || "customer@example.com",
                    phone: order.Diliveryaddress?.phone || payment.User.phone || "0771234567",
                    address: order.Diliveryaddress?.addressLine || "Main Street",
                    city: order.Diliveryaddress?.city || "Colombo",
                    district: order.Diliveryaddress?.district || "",
                    province: order.Diliveryaddress?.province || order.Diliveryaddress?.district || "",
                    postalCode: order.Diliveryaddress?.postalCode || "",
                    country: "Sri Lanka",
                },
                deliveryAddress: order.Diliveryaddress || null
            }
        });
    } catch (error) {
        console.error("Get payment details error:", error);
        return res.status(500).json({ message: "Failed to fetch payment details" });
    }
};

export const handlePayHereNotify = async (req, res) => {
    try {
        const {
            merchant_id,
            order_id,
            payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
        } = req.body;

        console.log(`[PayHere Webhook Received] payment_id: ${payment_id}, order_id: ${order_id}, status_code: ${status_code}`);

        // 1. Validate Expected Merchant ID from server environment
        const expectedMerchantId = (process.env.PAYHERE_MERCHANT_ID || "").trim();
        if (!merchant_id || merchant_id.toString().trim() !== expectedMerchantId) {
            console.error(`[PayHere Security Alert] Invalid merchant_id: received '${merchant_id}', expected '${expectedMerchantId}'`);
            return res.status(400).send("Invalid merchant ID");
        }

        // 2. Verify PayHere notification MD5 signature using timing-safe comparison
        const isValidSignature = verifyPayHereNotifyHash(
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            process.env.PAYHERE_MERCHANT_SECRET,
            md5sig
        );

        if (!isValidSignature) {
            console.error("[PayHere Security Alert] PayHere notification signature mismatch");
            return res.status(400).send("Invalid signature");
        }

        // 3. Validate Order ID format and query database
        if (!order_id || !mongoose.Types.ObjectId.isValid(order_id)) {
            console.error("[PayHere Security Alert] Invalid order ID format:", order_id);
            return res.status(400).send("Invalid order ID format");
        }

        const order = await Order.findById(order_id);
        if (!order) {
            console.error("[PayHere Security Alert] Order not found:", order_id);
            return res.status(404).send("Order not found");
        }

        const payment = await Payment.findOne({ Order: order._id });
        if (!payment) {
            console.error("[PayHere Security Alert] Payment record not found for order:", order._id);
            return res.status(404).send("Payment not found");
        }

        // 4. Verify payment/order relationship
        if (payment.Order.toString() !== order._id.toString()) {
            console.error("[PayHere Security Alert] Payment-Order relationship mismatch");
            return res.status(400).send("Payment-Order mismatch");
        }

        // 5. Verify Currency against authoritative server payment record
        const expectedCurrency = (payment.currency || "LKR").toUpperCase();
        if (!payhere_currency || payhere_currency.toString().trim().toUpperCase() !== expectedCurrency) {
            console.error(`[PayHere Security Alert] Currency mismatch: received '${payhere_currency}', expected '${expectedCurrency}'`);
            return res.status(400).send("Currency mismatch");
        }

        // 6. Verify Payment Amount against authoritative server-side record (Prevent Amount Tampering)
        const receivedAmount = Number(payhere_amount).toFixed(2);
        const expectedPaymentAmount = Number(payment.amount).toFixed(2);
        const expectedOrderTotal = Number(order.FinalTotal).toFixed(2);

        if (receivedAmount !== expectedPaymentAmount || receivedAmount !== expectedOrderTotal) {
            console.error(`[PayHere Security Alert] Amount tampering detected! Received: ${receivedAmount}, Expected Payment: ${expectedPaymentAmount}, Expected Order: ${expectedOrderTotal}`);
            return res.status(400).send("Payment amount mismatch");
        }

        // 7. Handle Idempotency / Duplicate Notifications
        if (payment.status === "Paid" && order.paymentStatus === "Paid") {
            console.log(`[PayHere Webhook] Duplicate notification received for already paid order ${order._id}. Idempotently returning OK.`);
            return res.status(200).send("OK");
        }

        // 8. Prevent resurrecting cancelled orders without authorization
        if (order.Orderstatus === "Cancelled") {
            console.warn(`[PayHere Webhook] Payment received for already Cancelled order ${order._id}. Marking payment as RefundPending.`);
            payment.status = "RefundPending";
            if (payment_id) {
                payment.transactionId = payment_id;
            }
            await payment.save();
            return res.status(200).send("OK");
        }

        // 9. Update status based on PayHere status_code (2 = Success, 0 = Pending, -1 = Canceled, -2 = Failed, -3 = Chargedback)
        if (status_code === "2") {
            payment.status = "Paid";
            payment.paidAt = new Date();
            if (payment_id) {
                payment.transactionId = payment_id;
            }
            await payment.save();

            const wasAlreadyConfirmed = order.Orderstatus === "Confirmed";
            order.paymentStatus = "Paid";
            order.Orderstatus = "Confirmed";

            if (!order.statusHistory) {
                order.statusHistory = [];
            }
            order.statusHistory.push({
                status: "Confirmed",
                changedAt: new Date(),
            });
            await order.save();

            // Deduct stock if order is transitioning to Confirmed
            if (!wasAlreadyConfirmed && Array.isArray(order.Products)) {
                for (const item of order.Products) {
                    if (item.productId) {
                        try {
                            const product = await Product.findById(item.productId);
                            if (product) {
                                product.stock = Math.max(0, product.stock - (item.quantity || 1));
                                product.isavailable = product.stock > 0;
                                await product.save();
                            }
                        } catch (stockErr) {
                            console.error(`Failed to decrement stock for product ${item.productId}:`, stockErr.message);
                        }
                    }
                }
            }

            // Real-time update for admin & client
            const io = req.app.get("io");
            if (io) {
                io.emit("orderUpdated", {
                    orderId: order._id,
                    status: "Confirmed",
                    paymentStatus: "Paid",
                });
            }
        } else if (status_code === "-1" || status_code === "-2" || status_code === "-3") {
            payment.status = "Failed";
            await payment.save();

            order.paymentStatus = "Failed";
            await order.save();
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("PayHere notify error:", error);
        return res.status(500).send("Internal server error");
    }
};
