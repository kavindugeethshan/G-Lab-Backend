import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../Middleware/authMiddleware.js";
import { createOrder, getMyOrders, getOrderById, cancelOwnOrder, updateOrderDeliveryAddress } from "../Controllers/OrderController.js";

const orderRouter = express.Router();

orderRouter.post("/", authMiddleware, createOrder);
orderRouter.get("/my-orders", authMiddleware, getMyOrders);
orderRouter.get("/:id", authMiddleware, getOrderById);
orderRouter.patch("/:id/address", authMiddleware, updateOrderDeliveryAddress);
orderRouter.put("/:id/address", authMiddleware, updateOrderDeliveryAddress);
orderRouter.patch("/:id/cancel", authMiddleware, cancelOwnOrder);
orderRouter.put("/:id/cancel", authMiddleware, cancelOwnOrder);

export default orderRouter;