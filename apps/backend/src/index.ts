import { Buffer } from "node:buffer"; // Import Buffer for Base64 conversion
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { generateText, streamText } from "ai";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
// import mermaid from "mermaid"; // Mermaid seems unused now, commenting out
import { z } from "zod";

import "dotenv/config";

// // Initialize mermaid (needed for parsing)
// // Using a basic config. Adjust if needed for specific parsing features.
// mermaid.initialize({});

const drawSchema = z.object({
	instruction: z.string().min(1, { message: "Instruction cannot be empty" }),
	existingDiagramCode: z.string().optional(),
});

// Zod schema for transcription input (form data)
const transcribeSchema = z.object({
	audio: z
		.instanceof(File)
		.refine((file) => file.size > 0, "Audio file cannot be empty"),
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
			const { instruction, existingDiagramCode } = c.req.valid("json");

			// Instantiate client and model inside handler again
			const google = createGoogleGenerativeAI({
				apiKey: process.env.GOOGLE_API_KEY,
			});
			const model = google("gemini-2.0-flash-exp"); // Use appropriate model name

			// Constant system prompt for AI context
			const systemPrompt = `You are an expert in Mermaid diagrams. Generate ONLY the Mermaid code block based on the user's instruction. Do not include any explanations, comments, or surrounding text like \`\`\`mermaid ... \`\`\`. Just output the raw Mermaid syntax. Pay close attention to the user's specific request, whether it's generating a new diagram or updating an existing one.`;

			// Construct the user prompt based on whether existingDiagramCode is present
			let userPrompt = instruction;
			if (existingDiagramCode) {
				userPrompt = `Update the following Mermaid diagram code:\n\`\`\`mermaid\n${existingDiagramCode}\n\`\`\`\nto match the new instruction: ${instruction}`;
			}

			const { text } = await generateText({
				model, // Use model defined in handler
				system: systemPrompt,
				prompt: userPrompt,
			});

			const cleanText = text
				.trim()
				.replace(/^```mermaid\n?/, "")
				.replace(/```$/, "")
				.trim();

			console.log("Generated Mermaid:", cleanText);
			return c.text(cleanText);
		} catch (error) {
			console.error("Error generating diagram:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json(
				{ error: `Failed to generate diagram: ${errorMessage}` },
				500,
			);
		}
	})
	// --- New Transcription Route ---
	.post("/transcribe", zValidator("form", transcribeSchema), async (c) => {
		try {
			// Get validated form data
			const { audio: audioFile } = c.req.valid("form");

			// Get the ArrayBuffer from the audioFile
			const audioBuffer = await audioFile.arrayBuffer();

			console.log(
				`Received audio file: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`,
			);
			console.log("Attempting transcription...");

			// Instantiate client and model inside handler
			const google = createGoogleGenerativeAI({
				apiKey: process.env.GOOGLE_API_KEY,
			});
			const transcribeModel = google("gemini-1.5-flash-latest"); // Use appropriate model name

			// Prepare multimodal content array
			const multimodalContent = [
				{ type: "text", text: "Transcribe the following audio:" },
				// Use 'file' type and 'data' field with the raw ArrayBuffer
				{
					type: "file",
					data: audioBuffer,
					mimeType: audioFile.type || "audio/webm",
				},
			];

			// Prepare prompt for Gemini multimodal input using streamText
			const { textStream } = await streamText({
				model: transcribeModel, // Use the model defined for transcription
				messages: [
					{
						role: "user",
						// biome-ignore lint/suspicious/noExplicitAny: Bypassing TS error likely due to incorrect SDK types for multimodal message content.
						content: multimodalContent as any,
					},
				],
			});

			// Consume the stream to get the full text
			let transcriptionResult = "";
			for await (const delta of textStream) {
				transcriptionResult += delta;
			}

			console.log("Transcription result:", transcriptionResult);
			return c.text(transcriptionResult.trim());
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error("Validation Error:", error.errors);
				return c.json(
					{ error: "Invalid input", details: error.flatten() },
					400,
				);
			}
			console.error("Error during transcription:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json({ error: `Transcription failed: ${errorMessage}` }, 500);
		}
	});
// --- End Transcription Route ---

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
