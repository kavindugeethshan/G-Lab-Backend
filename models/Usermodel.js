import mongoose from "mongoose";

const userschema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true
    },

    firstname: {
      type: String,
      required: true
    },

    lastname: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      default: ""
    },

    address: {
      fullName: { type: String, default: "" },
      phone: { type: String, default: "" },
      addressLine: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      province: { type: String, default: "" },
      postalCode: { type: String, default: "" }
    },

    password: {
      type: String,
      required: true
    },

    isadmin: {
      type: Boolean,
      default: false,
      required: true
    },

    isblocked: {
      type: Boolean,
      default: false,
      required: true
    },

    isemailverified: {
      type: Boolean,
      default: false,
      required: true
    },
    //otp verification time
    emailverificationotp: {
      type: String
    },

    emailverificationotpexpires: {
      type: Date
    },

    Image: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.models.User || mongoose.model("User", userschema);

export default User;