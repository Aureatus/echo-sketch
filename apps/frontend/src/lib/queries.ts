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

// Mutation function for generating diagrams
export const drawMutationFn = async (
	payload: DrawMutationPayload,
): Promise<string> => {
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
	// Expecting plain text response (Mermaid code)
	return res.text();
};

// --- New Transcription Function ---
export const transcribeMutationFn = async (
	audioBlob: Blob,
): Promise<string> => {
	console.log("Sending transcription request via RPC with blob:", audioBlob);

	// Convert Blob to File for the backend validator
	const audioFile = new File([audioBlob], "recording.webm", {
		type: audioBlob.type || "audio/webm", // Use blob's type or default
		lastModified: Date.now(),
	});

	const res = await client.transcribe.$post({
		form: { audio: audioFile }, // Pass the File object
	});

	if (!res.ok) {
		let errorMessage = "Failed to fetch from /transcribe (RPC)";
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

	return res.text(); // Expecting plain text response (transcribed text)
};
