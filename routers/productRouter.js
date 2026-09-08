import express from "express";
import { getallProducts, getProductById } from "../Controllers/productcontroller.js";

const productRouter = express.Router();

productRouter.get("/", getallProducts);
productRouter.get("/:id", getProductById);

export default productRouter;