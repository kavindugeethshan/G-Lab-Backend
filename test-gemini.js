import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function testGemini() {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: "Say hello to G-Lab in one short sentence.",
        });

        console.log("Gemini Response:");
        console.log(response.text);
    } catch (error) {
        console.error("Gemini connection failed:");
        console.error(error.message);
    }
}

testGemini();