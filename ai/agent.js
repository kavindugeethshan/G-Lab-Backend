import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { searchProducts } from "../services/productService.js";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const tools = [
    {
        type: "function",
        name: "searchProducts",
        description:
            "Search G-Lab products using keyword, category, brand, price range, and limit. All prices are in Sri Lankan Rupees (LKR).",
        parameters: {
            type: "object",
            properties: {
                search: {
                    type: "string",
                    description:
                        "Product keyword such as laptop, gaming laptop, camera, SSD.",
                },
                category: {
                    type: "string",
                    description:
                        "Product category such as laptop, GPU, CPU, RAM, SSD, camera.",
                },
                brand: {
                    type: "string",
                    description:
                        "Product brand such as ASUS, MSI, Lenovo, Canon.",
                },
                minPrice: {
                    type: "number",
                    description: "Minimum product price in Sri Lankan Rupees.",
                },
                maxPrice: {
                    type: "number",
                    description: "Maximum product price in Sri Lankan Rupees.",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of products to return.",
                },
            },
        },
    },
];

export async function runAgent(userMessage) {
    // Send user message to Gemini
    const response = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: userMessage,
        tools,
    });

    // Find Gemini's function call
    const functionCall = response.steps?.find(
        (step) => step.type === "function_call"
    );

    // Gemini answered normally without using a tool
    if (!functionCall) {
        return {
            message: response.output_text || "No response generated.",
            products: [],
        };
    }

    console.log("AI Tool Call:", functionCall.name);
    console.log("Tool Arguments:", functionCall.arguments);

    // Execute our tool
    if (functionCall.name === "searchProducts") {
        const args = functionCall.arguments || {};

        const result = await searchProducts({
            search: args.search,
            category: args.category,
            brand: args.brand,
            minPrice: args.minPrice,
            maxPrice: args.maxPrice,
            limit: args.limit,
        });

        if (functionCall.name === "searchProducts") {
            const args = functionCall.arguments || {};

            const result = await searchProducts({
                search: args.search,
                category: args.category,
                brand: args.brand,
                minPrice: args.minPrice,
                maxPrice: args.maxPrice,
                limit: args.limit,
            });

            // Send tool result back to Gemini
            const finalResponse = await ai.interactions.create({
                model: "gemini-3.6-flash",
                previous_interaction_id: response.id,
                input: [
                    {
                        type: "function_result",
                        name: functionCall.name,
                        call_id: functionCall.id,
                        result: [
                            {
                                type: "text",
                                text: JSON.stringify(result),
                            },
                        ],
                    },
                ],
            });
            //console.log("\nFinal Gemini Response:");
            //console.log(JSON.stringify(finalResponse, null, 2));

            return {
                message: finalResponse.output_text || "No response generated.",
                products: result.products,
                pagination: result.pagination,
            };
        }
    }

    return {
        message: "Unknown tool requested.",
        products: [],
    };
}