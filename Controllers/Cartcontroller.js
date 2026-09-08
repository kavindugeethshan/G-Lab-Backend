import mongoose from "mongoose";
import Cart from "../models/Cartmodel.js";
import Product from "../models/Productmodel.js";

// Helper: Round money values to 2 decimal places
const roundCurrency = (value) => {
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

// Helper: Calculate discounted unit price
const getDiscountedPrice = (price, discount) => {
    const discounted = price - (price * (discount || 0)) / 100;
    return roundCurrency(discounted);
};

// Add product to cart
export const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.userId;

        // 1. Validate productId format
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        // 2. Validate quantity
        const numQuantity = Number(quantity);
        if (!Number.isInteger(numQuantity) || numQuantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a valid positive integer (at least 1)",
            });
        }

        // 3. Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        // Check if product is available
        if (product.isavailable === false) {
            return res.status(400).json({
                message: `${product.name} is currently unavailable`,
            });
        }

        // Check stock
        if (product.stock < numQuantity) {
            return res.status(400).json({
                message: "Not enough stock",
            });
        }

        // 4. Find user's cart
        let cart = await Cart.findOne({ user: userId });

        // Create cart if it doesn't exist
        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [
                    {
                        product: productId,
                        quantity: numQuantity,
                        price: product.price,
                    },
                ],
            });

            await cart.save();

            return res.status(201).json({
                message: "Product added to cart",
                cart,
            });
        }

        // Check whether product already exists in cart
        const existingItem = cart.items.find(
            (item) => item.product.toString() === productId
        );

        if (existingItem) {
            const newQuantity = existingItem.quantity + numQuantity;

            // Check stock for updated quantity
            if (newQuantity > product.stock) {
                return res.status(400).json({
                    message: "Not enough stock",
                });
            }

            existingItem.quantity = newQuantity;
            existingItem.price = product.price;
        } else {
            // Add new product to existing cart
            cart.items.push({
                product: productId,
                quantity: numQuantity,
                price: product.price,
            });
        }

        await cart.save();

        return res.status(200).json({
            message: "Product added to cart",
            cart,
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};

// Get user's cart
export const getCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find user's cart and populate product details
        const cart = await Cart.findOne({ user: userId }).populate(
            "items.product"
        );

        if (!cart) {
            return res.status(200).json({
                message: "Cart is empty",
                items: [],
                subtotal: 0,
                total: 0,
                itemCount: 0,
                totalQuantity: 0,
                totalDiscount: 0,
                finalPayableAmount: 0,
            });
        }

        let rawSubtotal = 0;
        let rawTotal = 0;
        let totalQuantity = 0;

        // Map cart items with details
        const items = cart.items.map((item) => {
            const product = item.product;

            // Filter out deleted or unavailable products
            if (!product || product.isavailable === false) {
                return null;
            }

            const priceChanged = item.price !== product.price;
            const discount = product.discount || 0;
            const discountedPrice = getDiscountedPrice(product.price, discount);

            const itemSubtotal = roundCurrency(product.price * item.quantity);
            const itemTotal = roundCurrency(discountedPrice * item.quantity);

            rawSubtotal += itemSubtotal;
            rawTotal += itemTotal;
            totalQuantity += item.quantity;

            return {
                product: product,
                quantity: item.quantity,
                originalPrice: product.price,
                discount: discount,
                discountedPrice: discountedPrice,
                itemSubtotal: itemSubtotal,
                itemTotal: itemTotal,
                priceChanged: priceChanged,
            };
        });

        // Permanently clear unavailable/deleted products from database cart
        const hasUnavailable = cart.items.some(
            (item) => !item.product || item.product.isavailable === false
        );

        if (hasUnavailable) {
            cart.items = cart.items.filter(
                (item) => item.product && item.product.isavailable !== false
            );
            await cart.save();
        }

        const availableItems = items.filter((item) => item !== null);
        const itemCount = availableItems.length;

        const subtotal = roundCurrency(rawSubtotal);
        const total = roundCurrency(rawTotal);
        const totalDiscount = roundCurrency(subtotal - total);
        const finalPayableAmount = total;

        return res.status(200).json({
            message: "Cart fetched successfully",
            items: availableItems,
            subtotal,
            total,
            itemCount,
            totalQuantity,
            totalDiscount,
            finalPayableAmount,
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};

// Update cart quantity
export const updateCartQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.userId;

        // Validate productId format
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        // Validate quantity
        const numQuantity = Number(quantity);
        if (!Number.isInteger(numQuantity) || numQuantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a valid positive integer (at least 1)",
            });
        }

        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        if (product.isavailable === false) {
            return res.status(400).json({
                message: `${product.name} is currently unavailable`,
            });
        }

        // Check stock
        if (numQuantity > product.stock) {
            return res.status(400).json({
                message: "Not enough stock",
            });
        }

        // Find user's cart
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
            });
        }

        // Find item in cart
        const item = cart.items.find(
            (item) => item.product.toString() === productId
        );

        if (!item) {
            return res.status(404).json({
                message: "Product not found in cart",
            });
        }

        // Update quantity and sync price
        item.quantity = numQuantity;
        item.price = product.price;

        await cart.save();

        return res.status(200).json({
            message: "Cart quantity updated",
            cart,
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};

// Remove product from cart
export const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.userId;

        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: "Invalid product ID",
            });
        }

        const cart = await Cart.findOneAndUpdate(
            { user: userId, "items.product": productId },
            { $pull: { items: { product: productId } } },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({
                message: "Cart or product in cart not found",
            });
        }

        return res.status(200).json({
            message: "Product removed from cart",
            cart,
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};

// Clear entire cart
export const clearCart = async (req, res) => {
    try {
        const userId = req.user.userId;

        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found",
            });
        }

        return res.status(200).json({
            message: "Cart cleared successfully",
            cart,
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
};
