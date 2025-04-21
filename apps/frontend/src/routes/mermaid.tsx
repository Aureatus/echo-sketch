import { MermaidDiffView } from "@/components/custom/DiffView";
import { GenerationHeader } from "@/components/custom/GenerationHeader";
import { HistorySidebar } from "@/components/custom/HistorySidebar";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { SidebarModal } from "@/components/layout/SidebarModal";
import { usePersistedHistory } from "@/hooks/usePersistedHistory";
import { usePersistedSelection } from "@/hooks/usePersistedSelection";
import { useTheme } from "@/hooks/useTheme";
import { generateDiagramText, generateDiagramVoice } from "@/lib/diagramFlow";
import type {
	DiagramResponse,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import mermaid from "mermaid";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

// Initialize Mermaid globally (if not already done)
if (typeof window !== "undefined" && !window.__MERMAID_INIT_DONE__) {
	mermaid.initialize({ startOnLoad: false });
	window.__MERMAID_INIT_DONE__ = true;
}

// Helper function to render Mermaid diagrams
const renderMermaidDiagram = async (
	container: HTMLDivElement | null,
	code: string,
	idPrefix: string,
	key: string | number, // Add key for unique IDs
): Promise<void> => {
	if (!container) return;
	container.innerHTML = ""; // Clear previous diagram
	if (!code.trim()) return;

	const uniqueId = `${idPrefix}-${key}`;
	try {
		// Ensure Mermaid is ready before rendering
		await mermaid.run({ nodes: [] }); // A way to wait for initialization/theme update
		const { svg, bindFunctions } = await mermaid.render(uniqueId, code);
		if (container) {
			// Check ref again as it might change
			container.innerHTML = svg;
			bindFunctions?.(container);
		}
	} catch (error) {
		console.error(`Mermaid render failed for ${uniqueId}:`, error);
		if (container) {
			container.textContent = `Error rendering diagram: ${error instanceof Error ? error.message : String(error)}`;
		}
	}
};

// loader: fetch initial diagram from localStorage
async function mermaidLoader() {
	const stored = localStorage.getItem("mermaidHistory");
	const history = stored ? JSON.parse(stored) : [];
	const initialDiagram =
		history.length > 0 ? history[history.length - 1].diagram : "";
	return { initialDiagram };
}

export const Route = createFileRoute("/mermaid")({
	loader: mermaidLoader,
	component: MermaidRouteComponent,
});

function MermaidRouteComponent() {
	const { initialDiagram } = useLoaderData({ from: "/mermaid", strict: true });
	const { resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const {
		status: micStatus,
		startRecording,
		stopRecording,
	} = useReactMediaRecorder({
		audio: {
			echoCancellation: true,
			noiseSuppression: true,
			autoGainControl: true,
		},
		onStop: async (_blobUrl, blob) => {
			const payload: VoiceToDiagramMutationPayload = {
				audioBlob: blob,
				existingDiagramCode: mermaidCode,
			};
			setLastVoicePayload(payload);
			try {
				setIsVoiceLoading(true);
				const { response } = await generateDiagramVoice(payload);
				setNewCode(response.diagram);
				setLastResponse(response);
				setIsModalOpen(false);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				toast.error("Voice-to-Diagram Failed", { description: msg });
			} finally {
				setIsVoiceLoading(false);
			}
		},
	});

	const [mermaidCode, setMermaidCode] = useState<string>(initialDiagram);
	const [newCode, setNewCode] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [lastVoicePayload, setLastVoicePayload] =
		useState<VoiceToDiagramMutationPayload | null>(null);
	const [newVersionKey, setNewVersionKey] = useState(0);
	const { history, addHistory } = usePersistedHistory("mermaidHistory");
	const [isVoiceLoading, setIsVoiceLoading] = useState(false);
	const [selectedTimestamp, setSelectedTimestamp] = usePersistedSelection(
		history,
		"mermaidHistorySelection",
	);

	const currentRef = useRef<HTMLDivElement>(null);
	const newRef = useRef<HTMLDivElement>(null);

	// Effect to update Mermaid theme ONLY
	useEffect(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
		});
		// Re-render current diagram after theme change by triggering its effect
		// This ensures the diagram adopts the new theme settings visually
		renderMermaidDiagram(
			currentRef.current,
			mermaidCode,
			"mermaid-current",
			"main-theme-update",
		);
		if (newCode) {
			renderMermaidDiagram(
				newRef.current,
				newCode,
				"mermaid-new",
				`${newVersionKey}-theme-update`,
			);
		}
	}, [resolvedTheme, mermaidCode, newCode, newVersionKey]);

	// Effect to render the "Current" diagram when code changes
	useEffect(() => {
		renderMermaidDiagram(
			currentRef.current,
			mermaidCode,
			"mermaid-current",
			"main",
		);
	}, [mermaidCode]); // Depends on the code

	// Effect to render the "New" diagram when new code/key changes
	useEffect(() => {
		if (newCode) {
			renderMermaidDiagram(
				newRef.current,
				newCode,
				"mermaid-new",
				newVersionKey,
			);
		} else if (newRef.current) {
			newRef.current.innerHTML = ""; // Clear if newCode is null
		}
	}, [newCode, newVersionKey]); // Depends on new code and its version

	// Effect to load code from history or selection changes
	useEffect(() => {
		if (history.length === 0) {
			setMermaidCode(""); // Set to empty if no history
			// Clear diff state
			setNewCode(null);
			setLastResponse(null);
			setLastVoicePayload(null);
			return;
		}

		// Determine the target timestamp (selected or latest)
		const ts = selectedTimestamp ?? history[history.length - 1].timestamp;
		const item = history.find((i) => i.timestamp === ts);

		if (item) {
			setMermaidCode(item.diagram); // Update the current code state
			// Clear any pending diff when loading from history
			setNewCode(null);
			setLastResponse(null);
			setLastVoicePayload(null);
		} else {
			// Fallback if timestamp not found (e.g., history cleared externally)
			const lastItem = history[history.length - 1];
			if (lastItem) {
				// Check if lastItem exists
				setMermaidCode(lastItem.diagram);
				setNewCode(null);
				setLastResponse(null);
				setLastVoicePayload(null);
			} else {
				setMermaidCode(""); // Set empty if history somehow became empty
			}
		}
	}, [history, selectedTimestamp]); // Correct dependencies

	// Update approve callback to set the current code
	const approve = useCallback(() => {
		if (newCode && lastResponse) {
			const timestamp = Date.now();
			addHistory({ ...lastResponse, timestamp: timestamp });
			setSelectedTimestamp(timestamp);
			setMermaidCode(newCode); // Set current code to the approved code
		}
		setNewCode(null);
		setLastResponse(null);
		setLastVoicePayload(null);
	}, [newCode, lastResponse, addHistory, setSelectedTimestamp]); // Removed setMermaidCode from deps, relies on newCode

	const decline = useCallback(() => {
		// Wrap in useCallback
		setNewCode(null);
		setLastResponse(null);
		setLastVoicePayload(null); // Clear voice payload on decline
	}, []); // No dependencies needed

	const retry = useCallback(async () => {
		// Wrap in useCallback
		// Keep existing mermaidCode in 'Current' view
		const codeToUseForRetry = mermaidCode; // Use the currently displayed code for context

		console.log("mermaid retry", {
			lastVoicePayload,
			lastResponse,
			codeToUseForRetry,
		});
		if (lastVoicePayload) {
			const toastId = toast.loading("Regenerating diagram (voice)...");
			try {
				const payload = {
					...lastVoicePayload,
					existingDiagramCode: codeToUseForRetry,
				};
				const { response } = await generateDiagramVoice(payload);
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				// Don't change oldCode here, keep the current view stable
				setNewCode(response.diagram);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch (error) {
				console.error("Voice retry failed:", error);
				toast.error("Voice retry failed, try text instruction?", {
					id: toastId,
				});
				// Maybe clear lastVoicePayload here if voice consistently fails?
			}
			return;
		}
		console.log("mermaid text retry", { lastResponse, codeToUseForRetry });
		if (lastResponse) {
			const toastId = toast.loading("Regenerating diagram (text)...");
			try {
				const { response } = await generateDiagramText({
					instruction: `${lastResponse.instruction}\n\nPlease regenerate with slight variations`,
					existingDiagramCode: codeToUseForRetry, // Provide context
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				// Don't change oldCode here
				setNewCode(response.diagram);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response); // Update lastResponse for potential further text retries
			} catch (error) {
				console.error("Text retry failed:", error);
				toast.error("Retry failed", { id: toastId });
			}
		}
	}, [lastVoicePayload, lastResponse, mermaidCode]); // Add dependencies

	const handleInstructionGenerated = useCallback(
		({ response }: { response: DiagramResponse }) => {
			// Keep existing mermaidCode in 'Current' view
			setNewCode(response.diagram);
			setLastResponse(response);
			setLastVoicePayload(null); // Clear voice payload as this came from text
			setIsModalOpen(false);
			setNewVersionKey((k) => k + 1); // Ensure new diagram renders
		},
		[],
	); // Add dependencies if needed, currently none

	return (
		<div className="flex flex-col md:flex-row h-full">
			<main className="flex-1 flex flex-col h-full">
				<header className="px-4 py-2 bg-card border-b flex justify-between items-center">
					<GenerationHeader
						mermaidCode={mermaidCode}
						setIsModalOpen={setIsModalOpen}
						startRecording={startRecording}
						stopRecording={stopRecording}
						micStatus={micStatus}
						isVoiceLoading={isVoiceLoading}
					/>
					<SidebarModal open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
						<HistorySidebar
							history={history}
							isOpen={true}
							selectedTimestamp={selectedTimestamp ?? 0}
							onItemClick={(item) => {
								setSelectedTimestamp(item.timestamp);
								setIsHistoryOpen(false);
							}}
						/>
					</SidebarModal>
				</header>
				{newCode ? (
					<MermaidDiffView
						currentRef={currentRef}
						newRef={newRef}
						approve={approve}
						retry={retry}
						decline={decline}
					/>
				) : (
					<div className="flex-1 flex flex-col h-full">
						<div className="flex-1 overflow-auto p-4">
							<div ref={currentRef} />
						</div>
					</div>
				)}
				<InstructionModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					onDiagramGenerated={handleInstructionGenerated}
					existingDiagramCode={mermaidCode}
				/>
			</main>
		</div>
	);
}
