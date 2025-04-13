import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import mermaid from "mermaid";
import { z } from "zod";

import "dotenv/config";

// Initialize mermaid (needed for parsing)
// Using a basic config. Adjust if needed for specific parsing features.
mermaid.initialize({});

const drawSchema = z.object({
	instruction: z.string().min(1, { message: "Instruction cannot be empty" }),
});

const app = new Hono()
	.use(compress())
	.use(cors())
	.use(logger())
	.get("/", (c) => {
		return c.text("Hello Hono!");
	})
	.post("/draw", zValidator("json", drawSchema), async (c) => {
		try {
			const { instruction } = c.req.valid("json");

			const google = createGoogleGenerativeAI({
				apiKey: process.env.GOOGLE_API_KEY,
			});

			const model = google("gemini-2.0-flash-exp");

			const { text } = await generateText({
				model,
				system: `You are an expert in Mermaid diagrams. Generate ONLY the Mermaid code block based on the user's instruction. Do not include any explanations, comments, or surrounding text like \`\`\`mermaid ... \`\`\`. Just output the raw Mermaid syntax.`,
				prompt: instruction,
			});

			const cleanText = text
				.trim()
				.replace(/^```mermaid\n?/, "")
				.replace(/```$/, "")
				.trim();

			// Validate the generated Mermaid syntax
			try {
				await mermaid.parse(cleanText);
				console.log("Generated Mermaid validated successfully:", cleanText);
				return c.text(cleanText);
			} catch (parseError) {
				console.error("Invalid Mermaid syntax generated:", parseError);
				console.error("--- Invalid Code ---:", cleanText);
				return c.json({ error: "AI generated invalid Mermaid syntax." }, 500);
			}
		} catch (error) {
			console.error("Error generating diagram:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json(
				{ error: `Failed to generate diagram: ${errorMessage}` },
				500,
			);
		}
	});

serve(
	{
		fetch: app.fetch,
		port: 3001,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);

export type AppType = typeof app;
