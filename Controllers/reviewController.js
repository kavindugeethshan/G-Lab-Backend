import mongoose from "mongoose";
import Review from "../models/Reviewmodel.js";
import Product from "../models/Productmodel.js";

// Helper function: Recalculate and update product rating average and count
const recalculateProductRating = async (productId) => {
  const allReviews = await Review.find({ product: productId });

  if (!allReviews || allReviews.length === 0) {
    await Product.findByIdAndUpdate(productId, {
      ratingAverage: 0,
      ratingCount: 0,
    });
    return { ratingAverage: 0, ratingCount: 0 };
  }

  const totalRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0);
  const ratingAverage = Number((totalRating / allReviews.length).toFixed(1));
  const ratingCount = allReviews.length;

  await Product.findByIdAndUpdate(productId, {
    ratingAverage,
    ratingCount,
  });

  return { ratingAverage, ratingCount };
};

// Create a new product review
export const createReview = async (req, res) => {
  try {
    // Get product ID from URL
    const { productId } = req.params;

    // Get rating and comment from request body
    const { rating, comment } = req.body;

    // Get logged-in user's ID from JWT
    const userId = req.user.userId;

    // 1. Validate product ID format
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    // 2. Validate rating presence and type
    if (rating === undefined || rating === null) {
      return res.status(400).json({
        message: "Rating is required",
      });
    }

    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // 3. Validate comment
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return res.status(400).json({
        message: "Review comment is required and cannot be empty",
      });
    }

    // 4. Ensure product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    // 5. Check duplicate review by same user for same product
    const existingReview = await Review.findOne({
      user: userId,
      product: productId,
    });

    if (existingReview) {
      console.log(`[Review] User ${userId} has already reviewed product ${productId}`);
      return res.status(400).json({
        message: "You have already reviewed this product",
      });
    }

    // 6. Create the review
    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment: comment.trim(),
    });

    // 7. Recalculate product rating
    const { ratingAverage, ratingCount } = await recalculateProductRating(productId);

    // Emit real-time Socket.IO event if connected
    const io = req.app.get("io");
    if (io) {
      console.log(`[Socket.IO] Emitting reviewCreated event for product ${productId}`);
      io.emit("reviewCreated", {
        productId,
        review,
        ratingAverage,
        ratingCount,
      });
    }

    return res.status(201).json({
      message: "Review created successfully",
      review,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get product rating
export const getProductRating = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId).select(
      "ratingAverage ratingCount"
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json({
      productId,
      ratingAverage: product.ratingAverage || 0,
      ratingCount: product.ratingCount || 0,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Get all reviews for a product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "firstname lastname Image")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      productId,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// Update own review
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Validate review ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    // Find review by ID
    const review = await Review.findById(id);

    // Check whether review exists
    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    // Check whether logged-in user owns this review
    if (review.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "You can only update your own review",
      });
    }

    // Require at least one field to update
    if (rating === undefined && comment === undefined) {
      return res.status(400).json({
        message: "Please provide a rating or comment to update",
      });
    }

    // Validate and update rating if provided
    if (rating !== undefined) {
      if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating must be an integer between 1 and 5",
        });
      }
      review.rating = rating;
    }

    // Validate and update comment if provided
    if (comment !== undefined) {
      if (typeof comment !== "string" || comment.trim().length === 0) {
        return res.status(400).json({
          message: "Review comment cannot be empty",
        });
      }
      review.comment = comment.trim();
    }

    // Save updated review
    await review.save();

    // Recalculate product rating after update
    await recalculateProductRating(review.product);

    return res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
};

// Delete review function
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate review ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    // Find review by ID
    const review = await Review.findById(id);

    // Check whether review exists
    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    // Check whether logged-in user owns this review
    if (review.user.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own review",
      });
    }

    const productId = review.product;

    // Delete review
    await Review.findByIdAndDelete(id);

    // Recalculate product rating (resets to 0 if no reviews remain)
    await recalculateProductRating(productId);

    return res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Internal server error",
    });
  }
};

//Admin get all reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "firstname lastname email Image")
      .populate("product", "name brand price")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "All reviews fetched successfully",
      count: reviews.length,
      reviews,
    });

  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
// Admin Delete review
export const adminDeleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid review ID",
      });
    }

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        message: "Review not found",
      });
    }

    const productId = review.product;

    await Review.findByIdAndDelete(id);

    // Recalculate product rating after deletion
    await recalculateProductRating(productId);

    return res.status(200).json({
      message: "Review deleted by admin successfully",
      reviewId: id,
    });

  } catch (error) {
    console.log(error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};