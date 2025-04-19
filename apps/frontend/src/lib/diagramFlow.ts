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
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			const response = await rpcFn(payload);
			const { diagram } = response;
			const result = await parseMermaidToExcalidraw(diagram);
			const elements = convertToExcalidrawElements(result.elements);
			return { response, elements };
		} catch (error: unknown) {
			lastError = error;
			const message = error instanceof Error ? error.message : String(error);
			console.warn(
				`DiagramFlow retry ${attempt}/${maxRetries} failed:`,
				message,
			);
		}
	}
	// All retries failed
	const errMsg =
		lastError instanceof Error ? lastError.message : String(lastError);
	throw new Error(
		`Failed to generate diagram after ${maxRetries} attempts: ${errMsg}`,
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
