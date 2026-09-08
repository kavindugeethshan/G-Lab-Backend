import express from "express";
import { createReview, getProductRating, getProductReviews, updateReview, deleteReview } from "../Controllers/reviewController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";

const reviewRouter = express.Router();


// PUBLIC ROUTES
// Anyone can view reviews
reviewRouter.get("/products/:productId/rating", getProductRating);
reviewRouter.get("/products/:productId/reviews", getProductReviews);



// PRIVATE USER ROUTES
// User must be logged in to create a review
reviewRouter.post("/products/:productId/reviews", authMiddleware, createReview);
reviewRouter.put("/reviews/:id", authMiddleware, updateReview);
reviewRouter.delete("/reviews/:id", authMiddleware, deleteReview);

export default reviewRouter;