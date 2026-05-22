/// <reference path="../../../sst-env.d.ts" />
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { generateText } from "ai";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Resource } from "sst";
import { z } from "zod";

import db from "./db/index.js";
import type { diagramTypeEnum } from "./db/schema.js";
import { diagrams } from "./db/schema.js";

import "dotenv/config";

// // Initialize mermaid (needed for parsing)
// // Using a basic config. Adjust if needed for specific parsing features.
// mermaid.initialize({});

type AppEnv = {
	Variables: {
		userId: string;
	};
};

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

const transcribeSchema = z.object({
	audio: z
		.instanceof(File)
		.refine((file) => file.size > 0, "Audio file cannot be empty"),
	existingDiagramCode: z.string().optional(),
});

async function saveOrUpdateDiagram(payload: {
	userId: string;
	diagramCode: string;
	instruction: string | null;
	diagramType: (typeof diagramTypeEnum.enumValues)[number];
}) {
	const { userId, diagramCode, instruction, diagramType } = payload;

	const [savedDiagram] = await db
		.insert(diagrams)
		.values({
			userId: userId,
			mermaidCode: diagramCode,
			instruction: instruction,
			diagramType: diagramType,
		})
		.onConflictDoUpdate({
			target: [diagrams.userId, diagrams.diagramType],
			set: {
				mermaidCode: diagramCode,
				instruction: instruction,
				updatedAt: sql`CURRENT_TIMESTAMP`,
			},
		})
		.returning({ id: diagrams.id });

	return savedDiagram;
}

const app = new Hono<AppEnv>()
	.use(logger())
	.use(
		cors({
			origin: [
				"http://localhost:3000",
				"https://localhost:3000",
				"https://echo-sketch.com",
			],
			allowHeaders: ["Content-Type", "X-User-ID"],
		}),
	)
	.use("*", async (c, next) => {
		const userId = c.req.header("X-User-ID");
		if (!userId) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		c.set("userId", userId);
		await next();
	})
	.get("/", (c) => {
		return c.text("Hello Hono!");
	})
	.post("/draw", zValidator("json", drawSchema), async (c) => {
		try {
			const { instruction, existingDiagramCode } = c.req.valid("json");
			const userId = c.get("userId");

			const mermaidCode = await generateDiagram(
				instruction,
				existingDiagramCode,
			);

			const savedDiagram = await saveOrUpdateDiagram({
				userId,
				diagramCode: mermaidCode,
				instruction,
				diagramType: "mermaid",
			});

			console.log(
				`User [${userId}] saved/updated diagram [${savedDiagram.id}]`,
			);

			return c.json({
				diagramId: savedDiagram.id,
				diagram: mermaidCode,
				instruction,
			});
		} catch (error) {
			console.error("Error in /draw endpoint:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return c.json(
				{ error: `Failed to draw or save diagram: ${errorMessage}` },
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
				const userId = c.get("userId");
				const audioBuffer = await audioFile.arrayBuffer();

				const transcript = await speechToText(audioBuffer, audioFile.type);
				console.log("Transcript for diagram:", transcript);

				const mermaidCode = await generateDiagram(
					transcript,
					existingDiagramCode,
				);

				const savedDiagram = await saveOrUpdateDiagram({
					userId,
					diagramCode: mermaidCode,
					instruction: transcript,
					diagramType: "mermaid",
				});

				console.log(
					`User [${userId}] saved/updated diagram [${savedDiagram.id}] from voice`,
				);

				return c.json({
					diagramId: savedDiagram.id,
					diagram: mermaidCode,
					instruction: transcript,
				});
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

export type AppType = typeof app;

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port: port,
});
