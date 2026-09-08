import Order from "../models/Ordermodel.js";
import Product from "../models/Productmodel.js";
import User from "../models/Usermodel.js";
import Cart from "../models/Cartmodel.js";
import Payment from "../models/Paymentmodel.js";


//------------------------------------------------------------------------
//CREATE ORDER
export const createOrder = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(400).json({
                message: "User not found",
            });
        }
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
            });
        }

        if (cart.items.length === 0) {
            return res.status(400).json({
                message: "Cart is empty",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Validate Delivery Address (Custom address in req.body takes precedence, falls back to user.address)
        const bodyAddr = req.body.deliveryAddress || req.body.Diliveryaddress;
        const rawAddr = bodyAddr || user.address || {};

        const fullName = (rawAddr.fullName || `${user.firstname || ""} ${user.lastname || ""}`).trim();
        const addressLine = (rawAddr.addressLine || "").trim();
        const city = (rawAddr.city || "").trim();
        const province = (rawAddr.province || rawAddr.district || "").trim();
        const district = (rawAddr.district || rawAddr.province || "").trim();
        const postalCode = (rawAddr.postalCode || "").trim();
        const phone = (rawAddr.phone || user.phone || "").trim();

        if (!fullName || !phone || !addressLine || !city || (!province && !district) || !postalCode) {
            return res.status(400).json({
                message: "Delivery address is incomplete. Please ensure Full Name, Phone, Address Line, City, Province, and Postal Code are provided."
            });
        }

        const orderProducts = [];

        for (const item of cart.items) {
            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    message: `Product not found: ${item.product}`,
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Not enough stock for ${product.name}`,
                });
            }

            orderProducts.push({
                productId: product._id,
                name: product.name,
                description: product.description,
                brand: product.brand,
                discount: product.discount || 0,
                price: product.price,
                quantity: item.quantity,
            });
        }

        let subtotal = 0;
        let totalDiscount = 0;

        for (const item of orderProducts) {
            const itemSubtotal = item.price * item.quantity;

            const discountAmount =
                (item.price * item.discount / 100) * item.quantity;

            subtotal += itemSubtotal;
            totalDiscount += discountAmount;
        }

        const shippingFee = 500;

        const finalTotal =
            subtotal - totalDiscount + shippingFee;

        const requestedMethod = req.body.paymentMethod === "COD" ? "COD" : "Card";

        const order = await Order.create({
            User: userId,
            Products: orderProducts,

            Subtotal: subtotal,
            TotalDiscount: totalDiscount,
            ShippingFee: shippingFee,
            FinalTotal: finalTotal,

            Diliveryaddress: {
                fullName,
                phone,
                addressLine,
                city,
                district,
                province,
                postalCode
            },

            Orderstatus: "Pending",
            paymentStatus: "Pending",
            paymentMethod: requestedMethod,

            statusHistory: [
                {
                    status: "Pending",
                    changedAt: new Date(),
                },
            ],
        });

        // If Cash on Delivery, automatically generate the COD Payment record
        if (requestedMethod === "COD") {
            const payment = await Payment.create({
                Order: order._id,
                User: userId,
                amount: finalTotal,
                currency: "LKR",
                method: "COD",
                gateway: "COD",
                status: "Pending",
            });
            order.paymentId = payment._id;
            await order.save();
        }

        cart.items = [];
        await cart.save();

        if (req.body.saveAsDefault) {
            user.address = {
                fullName,
                phone,
                addressLine,
                city,
                district,
                province,
                postalCode
            };
            if (phone) user.phone = phone;
            await user.save();
        }

        return res.status(201).json({
            message: requestedMethod === "COD" ? "Order placed successfully with Cash on Delivery" : "Order created successfully",
            order,
            paymentMethod: requestedMethod
        });
    } catch (error) {
        console.error("Create order error:", error);

        return res.status(500).json({
            message: "Failed to create order",
            error: error.message,
        });
    }
};
//------------------------------------------------------------------------
// GET MY ORDERS

export const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!userId) {
            return res.status(400).json({
                message: "User not found",
            });
        }

        const orders = await Order.find({ User: userId })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Orders fetched successfully",
            orders,
        });

    } catch (error) {
        console.log(error.message);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

//------------------------------------------------------------------------
// GET ORDER BY ID

export const getOrderById = async (req, res) => {
    try {
        const userId = req.user.userId; // changed here
        const { id } = req.params;

        if (!userId) {
            return res.status(400).json({
                message: "User not found",
            });
        }

        const order = await Order.findOne({
            _id: id,
            User: userId,
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        return res.status(200).json({
            message: "Order fetched successfully",
            order,
        });

    } catch (error) {
        console.log(error.message);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

//------------------------------------------------------------------------
// CANCEL OWN ORDER

export const cancelOwnOrder = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        // Check authenticated user
        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        // Check Order ID
        if (!id) {
            return res.status(400).json({
                message: "Order ID is required",
            });
        }

        // Find order belonging to logged-in user
        const order = await Order.findOne({
            _id: id,
            User: userId,
        });

        // Order not found or does not belong to user
        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        // Already cancelled
        if (order.Orderstatus === "Cancelled") {
            return res.status(400).json({
                message: "Order is already cancelled",
            });
        }

        // Cannot cancel shipped or delivered orders
        if (
            order.Orderstatus === "Shipped" ||
            order.Orderstatus === "Delivered"
        ) {
            return res.status(400).json({
                message: `Order cannot be cancelled because it is already ${order.Orderstatus}`,
            });
        }

        // Cancel order & restore stock if confirmed
        if (order.Orderstatus === "Confirmed" && Array.isArray(order.Products)) {
            for (const item of order.Products) {
                if (item.productId) {
                    const product = await Product.findById(item.productId);
                    if (product) {
                        product.stock += (item.quantity || 1);
                        product.isavailable = product.stock > 0;
                        await product.save();
                    }
                }
            }
        }

        order.Orderstatus = "Cancelled";
        if (order.paymentStatus === "Pending") {
            order.paymentStatus = "Failed";
        }

        if (order.paymentId) {
            try {
                await Payment.findByIdAndUpdate(order.paymentId, { status: "Cancelled" });
            } catch (pErr) {
                console.warn("Could not update payment on order cancel:", pErr.message);
            }
        }

        if (!order.statusHistory) {
            order.statusHistory = [];
        }

        order.statusHistory.push({
            status: "Cancelled",
            changedAt: new Date(),
        });

        await order.save();

        // Real-time update for admin & client
        const io = req.app.get("io");
        if (io) {
            io.emit("orderUpdated", { orderId: order._id, status: "Cancelled" });
        }

        return res.status(200).json({
            message: "Order cancelled successfully",
            order,
        });

    } catch (error) {
        console.log("Cancel order error:", error.message);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

//------------------------------------------------------------------------
// UPDATE ORDER DELIVERY ADDRESS (Pending Orders only)
export const updateOrderDeliveryAddress = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user.userId;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.User.toString() !== userId.toString()) {
            return res.status(403).json({ message: "You are not allowed to modify this order" });
        }

        if (order.Orderstatus !== "Pending" || order.paymentStatus === "Paid") {
            return res.status(400).json({
                message: "Delivery address cannot be updated because this order is already processed or paid."
            });
        }

        const addressData = req.body.deliveryAddress || req.body.address || req.body;
        const fullName = (addressData.fullName || "").trim();
        const phone = (addressData.phone || "").trim();
        const addressLine = (addressData.addressLine || "").trim();
        const city = (addressData.city || "").trim();
        const province = (addressData.province || addressData.district || "").trim();
        const district = (addressData.district || addressData.province || "").trim();
        const postalCode = (addressData.postalCode || "").trim();

        if (!fullName || !phone || !addressLine || !city || (!province && !district) || !postalCode) {
            return res.status(400).json({
                message: "Please fill in all required address fields: Full Name, Phone Number, Address Line, City, Province, and Postal Code."
            });
        }

        order.Diliveryaddress = {
            fullName,
            phone,
            addressLine,
            city,
            district,
            province,
            postalCode
        };

        await order.save();

        if (req.body.saveAsDefault) {
            const user = await User.findById(userId);
            if (user) {
                user.address = {
                    fullName,
                    phone,
                    addressLine,
                    city,
                    district,
                    province,
                    postalCode
                };
                if (phone) user.phone = phone;
                await user.save();
            }
        }

        return res.status(200).json({
            message: "Delivery address updated successfully",
            deliveryAddress: order.Diliveryaddress
        });
    } catch (error) {
        console.error("Update order delivery address error:", error);
        return res.status(500).json({
            message: "Failed to update delivery address",
            error: error.message
        });
    }
};