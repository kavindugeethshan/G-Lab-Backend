import express from "express";
import { runAgent } from "../ai/agent.js";

const aiRouter = express.Router();

// POST /chat -> Mounted under /ai, making it POST /ai/chat
aiRouter.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Validate request body
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid non-empty 'message' string is required.",
      });
    }

    // Call the AI Agent
    const result = await runAgent(message.trim());

    // Clean JSON response
    return res.status(200).json({
      success: true,
      message: result?.message || "",
      products: result?.products || [],
      pagination: result?.pagination || {},
    });
  } catch (error) {
    // Log server-side error without exposing credentials or internal details
    console.error("AI Agent Error in POST /ai/chat:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your AI request.",
    });
  }
});

export default aiRouter;
