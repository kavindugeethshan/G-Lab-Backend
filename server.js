import "dotenv/config";
import express from "express";
import { Server } from "socket.io";
import http from "http";
import dns from "dns";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import userRouter from "./routers/userRouter.js";
import productRouter from "./routers/productRouter.js";
import reviewRouter from "./routers/reviewRouter.js";
import adminRouter from "./routers/adminRouter.js";
import cartRouter from "./routers/CartRouters.js";
import orderRouter from "./routers/orderRouter.js";
import paymentRouter from "./routers/PaymentRouter.js";
import aiRouter from "./routers/aiRouter.js";

const app = express();

// ==========================================
// 1. SECURITY HEADERS (HELMET)
// ==========================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://firebasestorage.googleapis.com",
          "https://*.firebasestorage.app",
          "https://*.googleapis.com",
          "https://via.placeholder.com",
        ],
        mediaSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://firebasestorage.googleapis.com",
          "https://*.firebasestorage.app",
        ],
        connectSrc: [
          "'self'",
          "http://localhost:3001",
          "ws://localhost:3001",
          "http://localhost:5173",
          "ws://localhost:5173",
          "http://localhost:8080",
          "ws://localhost:8080",
          "https://firebasestorage.googleapis.com",
          "https://*.googleapis.com",
          "https://*.firebasestorage.app",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
        ],
        formAction: [
          "'self'",
          "https://sandbox.payhere.lk",
          "https://www.payhere.lk",
        ],
        frameSrc: [
          "'self'",
          "https://sandbox.payhere.lk",
          "https://www.payhere.lk",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

// ==========================================
// 2. CORS HARDENING (ENVIRONMENT ALLOWLIST)
// ==========================================
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : []),
].filter(Boolean);

const allowedOrigins = Array.from(
  new Set([...defaultAllowedOrigins, ...envAllowedOrigins])
);

export const isOriginAllowed = (origin) => {
  // Allow requests without Origin (e.g. server-to-server PayHere IPN webhooks, curl, mobile native apps)
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  // Allow local LAN IP addresses in development (e.g. mobile testing on 192.168.x.x)
  if (process.env.NODE_ENV !== "production") {
    const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
      origin
    );
    if (isLocalNetwork) return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    const corsErr = new Error("Not allowed by CORS");
    corsErr.status = 403;
    return callback(corsErr);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve built React frontend in production
const reactDistPath = path.join(__dirname, "frontend-react", "dist");
app.use(express.static(reactDistPath));

// Create HTTP server & Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  },
});

// Attach io instance to app so controllers can access it via req.app.get("io")
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// MongoDB connection
const mongoDBURI = process.env.MONGO_URI;
mongoose.connect(mongoDBURI).then(() => {
  console.log("Connected to MongoDB successfully ");
});

// Routes
app.use("/users", userRouter);
app.use("/products", productRouter);
app.use("/", reviewRouter);
app.use("/admin", adminRouter);
app.use("/cart", cartRouter);
app.use("/order", orderRouter);
app.use("/payments", paymentRouter);
app.use("/ai", aiRouter);

// 404 Not Found Middleware (SPA Fallback & JSON Fallback)
app.use((req, res) => {
  if (req.accepts("html")) {
    const indexPath = path.join(__dirname, "frontend-react", "dist", "index.html");
    return res.sendFile(indexPath, (err) => {
      if (err) {
        return res.status(404).json({
          message: "Resource not found",
          error: "Not Found",
        });
      }
    });
  }
  return res.status(404).json({
    message: "Resource not found",
    error: "Not Found",
  });
});

// ==========================================
// 3. GLOBAL CENTRALIZED ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  // CORS rejection
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "Not allowed by CORS",
    });
  }

  // If response headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  // Log error server-side safely without leaking to client
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);
  if (!isProduction && err.stack) {
    console.error(err.stack);
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: isProduction ? "Invalid input data" : err.message,
    });
  }

  // Handle JWT Error
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Return consistent sanitized JSON error response
  res.status(statusCode).json({
    success: false,
    message:
      isProduction && statusCode === 500
        ? "Internal server error"
        : (err.message || "Internal server error"),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});