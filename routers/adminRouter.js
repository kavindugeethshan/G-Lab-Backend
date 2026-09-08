import express from "express";
import {
    adminDashboard,
    updateOrderStatus,
    getAllOrders,
    getOrderDetails,
    searchOrders,
    filterOrders,
    getAllUsers,
    getUserDetails,
    blockUser,
    unblockUser,
    deleteUser,
    createAdmin
} from "../Controllers/adminController.js";

import { authMiddleware } from "../Middleware/authMiddleware.js";
import { adminMiddleware } from "../Middleware/adminMiddleware.js";
import { createProduct, createManyProducts, updateProduct, deleteProduct } from "../Controllers/productcontroller.js";
import { getAllReviews, adminDeleteReview } from "../Controllers/reviewController.js";
import { getDashboardStatistics } from "../Controllers/adminController.js";


const adminRouter = express.Router();

adminRouter.get("/dashboard", authMiddleware, adminMiddleware, adminDashboard);
adminRouter.post("/products/create", authMiddleware, adminMiddleware, createProduct);
adminRouter.post("/products/bulk", authMiddleware, adminMiddleware, createManyProducts);
adminRouter.put("/products/update/:id", authMiddleware, adminMiddleware, updateProduct);
adminRouter.delete("/products/:id", authMiddleware, adminMiddleware, deleteProduct);
adminRouter.patch("/orders/:id/status", authMiddleware, adminMiddleware, updateOrderStatus);
adminRouter.get("/orders", authMiddleware, adminMiddleware, getAllOrders);
adminRouter.get("/orders/search", authMiddleware, adminMiddleware, searchOrders);
adminRouter.get("/orders/filter", authMiddleware, adminMiddleware, filterOrders);
adminRouter.get("/orders/:id", authMiddleware, adminMiddleware, getOrderDetails);
adminRouter.get("/users", authMiddleware, adminMiddleware, getAllUsers);
adminRouter.post("/create-admin", authMiddleware, adminMiddleware, createAdmin);
adminRouter.get("/users/:id", authMiddleware, adminMiddleware, getUserDetails);
adminRouter.patch("/users/:id/block", authMiddleware, adminMiddleware, blockUser);
adminRouter.patch("/users/:id/unblock", authMiddleware, adminMiddleware, unblockUser);
adminRouter.delete("/users/:id", authMiddleware, adminMiddleware, deleteUser);
adminRouter.get("/reviews", authMiddleware, adminMiddleware, getAllReviews);
adminRouter.delete("/reviews/:id", authMiddleware, adminMiddleware, adminDeleteReview);
adminRouter.get("/statistics", authMiddleware, adminMiddleware, getDashboardStatistics);
export default adminRouter;