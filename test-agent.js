import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import { runAgent } from "./ai/agent.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    // Test AI Agent
    const result = await runAgent(
        "What ASUS laptops do you have and how much do they cost?"
    );

    console.log("\nAI Agent Result:");
    console.log(JSON.stringify(result, null, 2));

    await mongoose.disconnect();
} catch (error) {
    console.error("\nAgent test failed:");
    console.error(error.message);
}