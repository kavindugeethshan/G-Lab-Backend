import express from "express";

import {
    addToCart,
    getCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
} from "../Controllers/Cartcontroller.js";

import { authMiddleware } from "../Middleware/authMiddleware.js";

const cartRouter = express.Router();

// Add product to cart
cartRouter.post("/add", authMiddleware, addToCart);

// Get logged-in user's cart
cartRouter.get("/", authMiddleware, getCart);

// Update product quantity
cartRouter.put("/update/:productId", authMiddleware, updateCartQuantity);

// Remove product from cart
cartRouter.delete("/remove/:productId", authMiddleware, removeFromCart);

// Clear entire cart
cartRouter.delete("/clear", authMiddleware, clearCart);

export default cartRouter;