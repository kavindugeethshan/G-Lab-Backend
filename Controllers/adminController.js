import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Order from "../models/Ordermodel.js";
import User from "../models/Usermodel.js";
import Product from "../models/Productmodel.js";

// Admin Dashboard
export const adminDashboard = async (req, res) => {
    try {
        return res.status(200).json({
            message: "Welcome to Admin Dashboard",
            admin: req.user,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Update Order Status - Admin
export const updateOrderStatus = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate Order ID
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID",
            });
        }

        // Allowed statuses
        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ];

        // Validate status
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid or missing order status",
                allowedStatuses,
            });
        }

        // Start transaction
        session.startTransaction();

        // Find order
        const order = await Order.findById(id).session(session);

        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                message: "Order not found",
            });
        }

        // Allowed status transitions
        const allowedTransitions = {
            Pending: ["Confirmed", "Cancelled"],
            Confirmed: ["Shipped", "Cancelled"],
            Shipped: ["Delivered"],
            Delivered: [],
            Cancelled: [],
        };

        const currentStatus = order.Orderstatus;

        // Prevent duplicate status
        if (currentStatus === status) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Order is already in ${status} status`,
            });
        }

        // Validate transition
        if (
            !allowedTransitions[currentStatus] ||
            !allowedTransitions[currentStatus].includes(status)
        ) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                message: `Cannot change order status from ${currentStatus} to ${status}`,
            });
        }

        // --------------------------------------------------
        // STOCK DEDUCTION (Pending -> Confirmed)
        // --------------------------------------------------
        if (status === "Confirmed") {
            // Check stock for every product first
            for (const item of order.Products) {
                const product = await Product.findById(item.productId).session(session);

                if (!product) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).json({
                        message: `Product not found: ${item.productId}`,
                    });
                }

                if (product.stock < item.quantity) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        message: `Not enough stock for ${product.name}`,
                    });
                }
            }

            // Deduct stock
            for (const item of order.Products) {
                const product = await Product.findById(item.productId).session(session);
                product.stock -= item.quantity;
                product.isavailable = product.stock > 0;
                await product.save({ session });
            }
        }

        // --------------------------------------------------
        // STOCK RESTORATION (Confirmed -> Cancelled by Admin)
        // --------------------------------------------------
        if (status === "Cancelled" && currentStatus === "Confirmed") {
            for (const item of order.Products) {
                const product = await Product.findById(item.productId).session(session);
                if (product) {
                    product.stock += item.quantity;
                    product.isavailable = product.stock > 0;
                    await product.save({ session });
                }
            }
        }

        // Update order status and append to statusHistory
        order.Orderstatus = status;

        if (!order.statusHistory) {
            order.statusHistory = [];
        }

        order.statusHistory.push({
            status: status,
            changedAt: new Date(),
        });

        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Order status updated successfully",
            order,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.log("Update order status error:", error.message);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// View all orders - Admin
export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("User", "firstname lastname email")
            .populate("Products.productId", "name price brand image")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "All orders fetched successfully",
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// View Order Details - Admin
export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID",
            });
        }

        const order = await Order.findById(id)
            .populate("User", "firstname lastname email address")
            .populate("Products.productId", "name price brand category image");

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            });
        }

        return res.status(200).json({
            message: "Order details fetched successfully",
            order,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Search Orders by orderId, userId, or email - Admin
export const searchOrders = async (req, res) => {
    try {
        const { orderId, userId, email } = req.query;

        if (!orderId && !userId && !email) {
            return res.status(400).json({
                message: "Please provide at least one search parameter (orderId, userId, or email)",
            });
        }

        if (orderId) {
            if (!mongoose.Types.ObjectId.isValid(orderId)) {
                return res.status(400).json({
                    message: "Invalid order ID format",
                });
            }

            const order = await Order.findById(orderId)
                .populate("User", "firstname lastname email")
                .populate("Products.productId", "name price brand");

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            return res.status(200).json({
                message: "Order found",
                count: 1,
                orders: [order],
            });
        }

        if (userId) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({
                    message: "Invalid user ID format",
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            const orders = await Order.find({ User: user._id })
                .populate("User", "firstname lastname email")
                .populate("Products.productId", "name price brand")
                .sort({ createdAt: -1 });

            return res.status(200).json({
                message: "Orders found for user ID",
                count: orders.length,
                orders,
            });
        }

        if (email) {
            const cleanEmail = email.trim().toLowerCase();
            const user = await User.findOne({ email: cleanEmail });
            if (!user) {
                return res.status(404).json({
                    message: "User not found with provided email",
                });
            }

            const orders = await Order.find({ User: user._id })
                .populate("User", "firstname lastname email")
                .populate("Products.productId", "name price brand")
                .sort({ createdAt: -1 });

            return res.status(200).json({
                message: "Orders found for email",
                count: orders.length,
                orders,
            });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Filter Orders by Status - Admin
export const filterOrders = async (req, res) => {
    try {
        const { status } = req.query;

        if (!status) {
            return res.status(400).json({
                message: "Order status parameter is required",
            });
        }

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled",
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status filter",
                allowedStatuses,
            });
        }

        const orders = await Order.find({ Orderstatus: status })
            .populate("User", "email firstname lastname")
            .populate("Products.productId", "name price brand")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Orders filtered successfully",
            status,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// View All Users - Admin
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });

        return res.status(200).json({
            message: "All users fetched successfully",
            count: users.length,
            users,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// View User Details - Admin
export const getUserDetails = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({
            message: "User details fetched successfully",
            user,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Block User - Admin
export const blockUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Prevent blocking admin users
        if (user.isadmin) {
            return res.status(403).json({
                message: "Admin users cannot be blocked",
            });
        }

        user.isblocked = true;
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json({
            message: "User blocked successfully",
            user: userResponse,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Unblock User - Admin
export const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        user.isblocked = false;
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(200).json({
            message: "User unblocked successfully",
            user: userResponse,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Delete User - Admin
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Prevent admin from deleting another admin user
        if (user.isadmin) {
            return res.status(403).json({
                message: "Admin users cannot be deleted",
            });
        }

        await User.findByIdAndDelete(id);

        return res.status(200).json({
            message: "User deleted successfully",
            deletedUserId: id,
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// Get Dashboard Statistics - Admin
export const getDashboardStatistics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments({ isActive: { $ne: false } });
        const totalOrders = await Order.countDocuments();
        const lowStockCount = await Product.countDocuments({ stock: { $lte: 5 }, isActive: { $ne: false } });

        const pendingOrders = await Order.countDocuments({ Orderstatus: "Pending" });
        const confirmedOrders = await Order.countDocuments({ Orderstatus: "Confirmed" });
        const shippedOrders = await Order.countDocuments({ Orderstatus: "Shipped" });
        const deliveredOrders = await Order.countDocuments({ Orderstatus: "Delivered" });
        const cancelledOrders = await Order.countDocuments({ Orderstatus: "Cancelled" });

        // Total revenue calculation excluding cancelled orders
        const revenueResult = await Order.aggregate([
            { $match: { Orderstatus: { $ne: "Cancelled" } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $ifNull: ["$FinalTotal", "$Subtotal"] } },
                },
            },
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Sales over time (Line Chart data by date)
        const salesOverTime = await Order.aggregate([
            { $match: { Orderstatus: { $ne: "Cancelled" } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    revenue: { $sum: { $ifNull: ["$FinalTotal", "$Subtotal"] } },
                    orders: { $sum: 1 },
                },
            },
            { $sort: { "_id": 1 } },
            { $limit: 30 }
        ]);

        // Category breakdown (Bar Chart data)
        const categoryStats = await Product.aggregate([
            { $match: { isActive: { $ne: false } } },
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 },
                    totalStock: { $sum: "$stock" }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Top selling products from order items
        const topProducts = await Order.aggregate([
            { $match: { Orderstatus: { $ne: "Cancelled" } } },
            { $unwind: "$Products" },
            {
                $group: {
                    _id: "$Products.name",
                    productId: { $first: "$Products.productId" },
                    name: { $first: "$Products.name" },
                    brand: { $first: "$Products.brand" },
                    price: { $first: "$Products.price" },
                    totalSold: { $sum: "$Products.quantity" },
                    totalRevenue: { $sum: { $multiply: ["$Products.price", "$Products.quantity"] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // Recent orders (latest 5)
        const recentOrders = await Order.find()
            .populate("User", "firstname lastname email")
            .sort({ createdAt: -1 })
            .limit(5);

        // Low stock products list (latest 5 with stock <= 5)
        const lowStockItems = await Product.find({ stock: { $lte: 5 }, isActive: { $ne: false } })
            .sort({ stock: 1 })
            .limit(5);

        // Recent activity feed
        const recentUsers = await User.find().sort({ createdAt: -1 }).limit(3);
        const recentActivity = [];

        recentOrders.slice(0, 3).forEach(o => {
            const customerName = o.User ? `${o.User.firstname || ''} ${o.User.lastname || ''}`.trim() : 'Customer';
            recentActivity.push({
                type: 'order',
                title: `New Order #${String(o._id).substring(18)}`,
                desc: `${customerName} placed an order for Rs. ${(o.FinalTotal || 0).toLocaleString()} (${o.Orderstatus})`,
                date: o.createdAt
            });
        });

        recentUsers.forEach(u => {
            const userName = `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.email;
            recentActivity.push({
                type: 'user',
                title: `New Customer Registration`,
                desc: `${userName} joined G-LAB`,
                date: u.createdAt
            });
        });

        lowStockItems.slice(0, 3).forEach(p => {
            recentActivity.push({
                type: 'warning',
                title: `Low Stock Alert`,
                desc: `${p.name} has only ${p.stock} units left in stock`,
                date: p.updatedAt || p.createdAt
            });
        });

        recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.status(200).json({
            message: "Dashboard statistics fetched successfully",
            statistics: {
                totalUsers,
                totalProducts,
                totalOrders,
                totalRevenue,
                lowStockCount,
                pendingOrders,
                confirmedOrders,
                shippedOrders,
                deliveredOrders,
                cancelledOrders,
                salesOverTime,
                categoryStats,
                topProducts,
                recentOrders,
                lowStockItems,
                recentActivity: recentActivity.slice(0, 5)
            },
        });
    } catch (error) {
        console.error("getDashboardStatistics error:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Create New Admin User - Authenticated Admin Only
export const createAdmin = async (req, res) => {
    try {
        const { email, firstname, lastname, password } = req.body;

        // 1. Validate email
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

        // 2. Validate first and last name
        if (!firstname || typeof firstname !== "string" || firstname.trim().length < 2) {
            return res.status(400).json({
                message: "First name must be at least 2 characters",
            });
        }
        if (!lastname || typeof lastname !== "string" || lastname.trim().length < 2) {
            return res.status(400).json({
                message: "Last name must be at least 2 characters",
            });
        }

        // 3. Validate password
        if (!password || typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long",
            });
        }

        // 4. Check whether email already exists
        const existingUser = await User.findOne({ email: cleanEmail });
        if (existingUser) {
            return res.status(409).json({
                message: "A user with this email address already exists",
            });
        }

        // 5. Hash password with bcrypt
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 6. Create admin user
        const newAdmin = await User.create({
            email: cleanEmail,
            firstname: firstname.trim(),
            lastname: lastname.trim(),
            password: hashedPassword,
            isadmin: true,
            isemailverified: true
        });

        // 7. Exclude password from response
        const adminResponse = newAdmin.toObject();
        delete adminResponse.password;

        return res.status(201).json({
            message: "Admin account created successfully",
            admin: adminResponse,
        });

    } catch (error) {
        console.error("createAdmin error:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
};
