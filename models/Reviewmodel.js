import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    // User who created the review
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Product being reviewed
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Rating from 1 to 5
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Review comment
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;