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
	DrawMutationPayload,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import { useMutation } from "@tanstack/react-query";
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

	const [mermaidCode, setMermaidCode] = useState<string>(initialDiagram);
	const [newCode, setNewCode] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [lastVoicePayload, setLastVoicePayload] =
		useState<VoiceToDiagramMutationPayload | null>(null);
	const [lastTextPayload, setLastTextPayload] =
		useState<DrawMutationPayload | null>(null);
	const [newVersionKey, setNewVersionKey] = useState(0);
	const { history, addHistory } = usePersistedHistory("mermaidHistory");
	const [selectedTimestamp, setSelectedTimestamp] = usePersistedSelection(
		history,
		"mermaidHistorySelection",
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);

	const currentRef = useRef<HTMLDivElement>(null);
	const newRef = useRef<HTMLDivElement>(null);

	const showDiff = useCallback(
		(
			response: DiagramResponse,
			sourcePayload: VoiceToDiagramMutationPayload | DrawMutationPayload,
		) => {
			setNewCode(response.diagram);
			setLastResponse(response);
			setNewVersionKey((k) => k + 1);
			setIsModalOpen(false);

			if ("audioBlob" in sourcePayload) {
				setLastVoicePayload(sourcePayload);
				setLastTextPayload(null);
			} else {
				setLastTextPayload(sourcePayload);
				setLastVoicePayload(null);
			}
		},
		[],
	);

	const handleModalDiagramGenerated = useCallback(
		({
			response,
			originalPayload,
		}: {
			response: DiagramResponse;
			elements: unknown[];
			originalPayload: DrawMutationPayload;
		}) => {
			toast.success("Diagram generated from text (via modal)");
			showDiff(response, originalPayload);
		},
		[showDiff],
	);

	const approve = useCallback(() => {
		if (newCode && lastResponse) {
			const timestamp = Date.now();
			addHistory({ ...lastResponse, timestamp: timestamp });
			setSelectedTimestamp(timestamp);
			setMermaidCode(newCode);
		}
		setNewCode(null);
		setLastResponse(null);
		setLastVoicePayload(null);
		setLastTextPayload(null);
	}, [newCode, lastResponse, addHistory, setSelectedTimestamp]);

	const decline = useCallback(() => {
		setNewCode(null);
		setLastResponse(null);
		setLastVoicePayload(null);
		setLastTextPayload(null);
	}, []);

	const mutationVoice = useMutation({
		mutationFn: (payload: VoiceToDiagramMutationPayload) =>
			generateDiagramVoice(payload).then(({ response }) => ({
				response,
				payload,
			})),
		onSuccess: ({ response, payload }) => {
			toast.success("Diagram generated from voice");
			showDiff(response, payload);
		},
		onError: (error) => {
			toast.error("Voice-to-Diagram Failed", { description: error.message });
			setLastVoicePayload(null);
		},
	});

	const mutationText = useMutation({
		mutationFn: (payload: DrawMutationPayload) =>
			generateDiagramText(payload).then(({ response }) => ({
				response,
				payload,
			})),
		onSuccess: ({ response, payload }) => {
			toast.success("Diagram generated from text");
			showDiff(response, payload);
		},
		onError: (error) => {
			toast.error("Diagram Generation Failed", { description: error.message });
			setLastTextPayload(null);
		},
	});

	const retry = useCallback(async () => {
		const codeToUseForRetry = mermaidCode;

		console.log("mermaid retry", {
			lastVoicePayload,
			lastTextPayload,
			codeToUseForRetry,
		});
		if (lastVoicePayload) {
			const payload = {
				...lastVoicePayload,
				existingDiagramCode: codeToUseForRetry,
			};
			mutationVoice.mutate(payload);
		} else if (lastTextPayload) {
			const payload = {
				...lastTextPayload,
				instruction: `${lastTextPayload.instruction}\n\nPlease regenerate with slight variations`,
				existingDiagramCode: codeToUseForRetry,
			};
			mutationText.mutate(payload);
		} else {
			toast.error("Cannot retry", {
				description: "No previous voice or text generation attempt found.",
			});
		}
	}, [
		mermaidCode,
		lastVoicePayload,
		lastTextPayload,
		mutationVoice,
		mutationText,
	]);

	const handleVoiceStop = useCallback(
		(_blobUrl: string, blob: Blob) => {
			const payload: VoiceToDiagramMutationPayload = {
				audioBlob: blob,
				existingDiagramCode: mermaidCode,
			};
			mutationVoice.mutate(payload);
		},
		[mermaidCode, mutationVoice],
	);

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
		onStop: handleVoiceStop,
	});

	useEffect(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
		});
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

	useEffect(() => {
		renderMermaidDiagram(
			currentRef.current,
			mermaidCode,
			"mermaid-current",
			"main",
		);
	}, [mermaidCode]);

	useEffect(() => {
		if (newCode) {
			renderMermaidDiagram(
				newRef.current,
				newCode,
				"mermaid-new",
				newVersionKey,
			);
		} else if (newRef.current) {
			newRef.current.innerHTML = "";
		}
	}, [newCode, newVersionKey]);

	useEffect(() => {
		if (history.length === 0) {
			setMermaidCode("");
			setNewCode(null);
			setLastResponse(null);
			setLastVoicePayload(null);
			setLastTextPayload(null);
			return;
		}

		const ts = selectedTimestamp ?? history[history.length - 1].timestamp;
		const item = history.find((i) => i.timestamp === ts);

		if (item) {
			setMermaidCode(item.diagram);
			setNewCode(null);
			setLastResponse(null);
			setLastVoicePayload(null);
			setLastTextPayload(null);
		} else {
			const lastItem = history[history.length - 1];
			if (lastItem) {
				setMermaidCode(lastItem.diagram);
				setNewCode(null);
				setLastResponse(null);
				setLastVoicePayload(null);
				setLastTextPayload(null);
			} else {
				setMermaidCode("");
			}
		}
	}, [history, selectedTimestamp]);

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
						isVoiceLoading={mutationVoice.isPending}
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
					onDiagramGenerated={handleModalDiagramGenerated}
					existingDiagramCode={mermaidCode}
				/>
			</main>
		</div>
	);
}
