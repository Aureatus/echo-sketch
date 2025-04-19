import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import {
	type DiagramResponse,
	type DrawMutationPayload,
	type VoiceToDiagramMutationPayload,
	drawMutationFn,
	voiceToDiagramMutationFn,
} from "./queries";

/**
 * Generic retry logic for RPC + parsing to Excalidraw elements.
 * @param rpcFn RPC function returning DiagramResponse
 * @param payload RPC payload
 */
export async function generateDiagramFlow<P>(
	rpcFn: (payload: P) => Promise<DiagramResponse>,
	payload: P,
): Promise<{ response: DiagramResponse; elements: unknown[] }> {
	const maxRetries = 8;
	let lastError: unknown;
	const errors: string[] = [];
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		// On retry, if this is a text draw payload, embed error history in instruction
		let attemptPayload: P = payload;
		if (
			attempt > 1 &&
			errors.length > 0 &&
			(payload as DrawMutationPayload).instruction !== undefined
		) {
			const drawPayload = payload as DrawMutationPayload;
			attemptPayload = {
				...drawPayload,
				instruction: `${drawPayload.instruction}\n\nPrevious errors encountered:\n${errors.join("\n")}`,
			} as unknown as P;
		}
		try {
			const response = await rpcFn(attemptPayload);
			const { diagram } = response;
			const result = await parseMermaidToExcalidraw(diagram);
			const elements = convertToExcalidrawElements(result.elements);
			return { response, elements };
		} catch (error: unknown) {
			lastError = error;
			const message = error instanceof Error ? error.message : String(error);
			errors.push(message);
			console.warn(
				`DiagramFlow retry ${attempt}/${maxRetries} failed:`,
				message,
			);
		}
	}
	// All retries failed
	const errMsg =
		lastError instanceof Error ? lastError.message : String(lastError);
	const history = errors.join(" | ");
	throw new Error(
		`Failed to generate diagram after ${maxRetries} attempts: ${errMsg}. Previous errors: ${history}`,
	);
}

/**
 * Generate diagram from draw (text) input.
 */
export async function generateDiagramText(payload: DrawMutationPayload) {
	return generateDiagramFlow(drawMutationFn, payload);
}

/**
 * Generate diagram from voice input.
 */
export async function generateDiagramVoice(
	payload: VoiceToDiagramMutationPayload,
) {
	return generateDiagramFlow(voiceToDiagramMutationFn, payload);
}
