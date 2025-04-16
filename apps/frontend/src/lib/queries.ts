import { queryOptions } from "@tanstack/react-query";
import { client } from "./rpc-client";

// Define the mutation payload type
export interface DrawMutationPayload {
	instruction: string;
	existingDiagramCode?: string;
}

export const indexQueryOptions = queryOptions({
	queryKey: ["index"],
	queryFn: async () => {
		const res = await client.index.$get();
		if (!res.ok) {
			throw new Error("Server error"); // Or handle more specific errors
		}
		return res.text();
	},
});

// Payload type for voice-to-diagram
export interface VoiceToDiagramMutationPayload {
	audioBlob: Blob;
	existingDiagramCode?: string;
}

// Response type for diagram and instruction
export interface DiagramResponse {
	diagram: string;
	instruction: string;
}

// Mutation function for voice-to-diagram
export const voiceToDiagramMutationFn = async (
	payload: VoiceToDiagramMutationPayload,
): Promise<DiagramResponse> => {
	const { audioBlob, existingDiagramCode } = payload;
	const audioFile = new File([audioBlob], "recording.webm", {
		type: audioBlob.type || "audio/webm",
		lastModified: Date.now(),
	});
	const form: { audio: File; existingDiagramCode?: string } = {
		audio: audioFile,
	};
	if (existingDiagramCode) {
		form.existingDiagramCode = existingDiagramCode;
	}
	const res = await client["voice-to-diagram"].$post({ form });
	if (!res.ok) {
		let errorMessage = "Failed to fetch from /voice-to-diagram (RPC)";
		try {
			const errorData = await res.json();
			if (errorData && typeof errorData === "object" && "error" in errorData) {
				errorMessage = String(errorData.error);
			} else {
				const textError = await res.text();
				errorMessage = textError || errorMessage;
			}
		} catch (e) {
			const textError = await res.text();
			errorMessage = textError || errorMessage;
		}
		throw new Error(errorMessage);
	}
	return res.json();
};

// Mutation function for generating diagrams
export const drawMutationFn = async (
	payload: DrawMutationPayload,
): Promise<DiagramResponse> => {
	const res = await client.draw.$post({ json: payload });
	if (!res.ok) {
		// Attempt to parse error from response, default to generic message
		let errorMessage = "Failed to fetch from /draw";
		try {
			// Assuming error response is JSON like { error: "message" }
			const errorData = await res.json();
			if (errorData && typeof errorData === "object" && "error" in errorData) {
				errorMessage = String(errorData.error);
			} else {
				// Fallback if parsing fails or format is unexpected
				const textError = await res.text();
				errorMessage = textError || errorMessage;
			}
		} catch (e) {
			// If res.json() fails (e.g., response is not JSON)
			const textError = await res.text();
			errorMessage = textError || errorMessage;
		}
		throw new Error(errorMessage);
	}
	// Expecting JSON response with diagram and instruction
	return res.json();
};
