import express from "express";
import { createPayment, getPaymentDetails, handlePayHereNotify } from "../Controllers/paymentController.js";
import { authMiddleware } from "../Middleware/authMiddleware.js";
const paymentRouter = express.Router();

paymentRouter.post("/create", authMiddleware, createPayment);
paymentRouter.get("/:id", authMiddleware, getPaymentDetails);
paymentRouter.post("/notify", handlePayHereNotify);

export default paymentRouter;
