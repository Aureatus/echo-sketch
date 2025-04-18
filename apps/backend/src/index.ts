/// <reference path="../../../sst-env.d.ts" />
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Resource } from "sst";

// import mermaid from "mermaid"; // Mermaid seems unused now, commenting out
import { z } from "zod";

import "dotenv/config";

// // Initialize mermaid (needed for parsing)
// // Using a basic config. Adjust if needed for specific parsing features.
// mermaid.initialize({});

async function generateDiagram(
	userInstruction: string,
	existingDiagram: string | undefined,
) {
	const google = createGoogleGenerativeAI({
		apiKey: Resource.GeminiAPIKey.value,
	});
	const model = google("gemini-2.0-flash-001");

	const systemPrompt = `You are an expert in Mermaid diagrams. Generate ONLY the Mermaid code block based on the user's instruction. Do not include any explanations, comments, or surrounding text like \`\`\`mermaid ... \`\`\`. Just output the raw Mermaid syntax. Pay close attention to the user's specific request, whether it's generating a new diagram or updating an existing one.`;

	const userPrompt = existingDiagram
		? `Update the following Mermaid diagram code:\n\`\`\`mermaid\n${existingDiagram}\n\`\`\`\nto match the new instruction: ${userInstruction}`
		: userInstruction;

	const { text } = await generateText({
		model,
		system: systemPrompt,
		prompt: userPrompt,
	});

	const cleanText = text
		.trim()
		.replace(/^```mermaid\n?/, "")
		.replace(/```$/, "")
		.trim();

	console.log("Generated Mermaid:", cleanText);
	return cleanText;
}

async function speechToText(audioBuffer: ArrayBuffer, audioType: string) {
	const google = createGoogleGenerativeAI({
		apiKey: Resource.GeminiAPIKey.value,
	});
	const model = google("gemini-2.0-flash-001");
	const multimodalContent = [
		{
			type: "file",
			data: audioBuffer,
			mimeType: audioType,
		},
	];
	const { text: transcriptionResult } = await generateText({
		model,
		system:
			"You are a speech-to-text transcription engine. Only transcribe the audio exactly as spoken, with no additional commentary, questions, or explanations.",
		messages: [
			{
				role: "user",
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				content: multimodalContent as any,
			},
		],
	});
	const transcript = transcriptionResult.trim();
	return transcript;
}

const drawSchema = z.object({
	instruction: z.string().min(1, { message: "Instruction cannot be empty" }),
	existingDiagramCode: z.string().optional(),
});

// Zod schema for transcription input (form data)
const transcribeSchema = z.object({
	audio: z
		.instanceof(File)
		.refine((file) => file.size > 0, "Audio file cannot be empty"),
	existingDiagramCode: z.string().optional(),
});

const app = new Hono()
	.use(logger())
	.use(
		cors({
			origin: "echo-sketch.com",
		}),
	)
	.get("/", (c) => {
		return c.text("Hello Hono!");
	})
	.post("/draw", zValidator("json", drawSchema), async (c) => {
		try {
			const { instruction, existingDiagramCode } = c.req.valid("json");

			const cleanText = await generateDiagram(instruction, existingDiagramCode);
			return c.json({ diagram: cleanText, instruction });
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
	.post(
		"/voice-to-diagram",
		zValidator("form", transcribeSchema),
		async (c) => {
			try {
				const { audio: audioFile, existingDiagramCode } = c.req.valid("form");
				const audioBuffer = await audioFile.arrayBuffer();

				const transcript = await speechToText(audioBuffer, audioFile.type);

				console.log("Transcript for diagram:", transcript);

				const cleanDiagram = await generateDiagram(
					transcript,
					existingDiagramCode,
				);
				return c.json({ diagram: cleanDiagram, instruction: transcript });
			} catch (error) {
				if (error instanceof z.ZodError) {
					console.error("Validation Error (voice-to-diagram):", error.errors);
					return c.json(
						{ error: "Invalid input", details: error.flatten() },
						400,
					);
				}
				console.error("Error in voice-to-diagram:", error);
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				return c.json(
					{ error: `Voice-to-diagram failed: ${errorMessage}` },
					500,
				);
			}
		},
	);
// --- End Voice-to-Diagram Route ---

export const handler = handle(app);

export type AppType = typeof app;
