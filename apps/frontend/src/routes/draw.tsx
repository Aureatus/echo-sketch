import { Excalidraw } from "@excalidraw/excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { DrawDiffView } from "@/components/custom/DiffView";
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
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

// Initialize Mermaid once with global guard and disable duplicate registrations
declare global {
	interface Window {
		__MERMAID_INIT_DONE__?: boolean;
	}
}
if (typeof window !== "undefined" && !window.__MERMAID_INIT_DONE__) {
	mermaid.initialize({ startOnLoad: false });
	window.__MERMAID_INIT_DONE__ = true;
}

// Safe parse to handle duplicate registration errors
async function safeParseMermaidToExcalidraw(diagram: string) {
	try {
		return await parseMermaidToExcalidraw(diagram);
	} catch (err: unknown) {
		if (err instanceof Error && err.message.includes("already registered")) {
			// reinitialize mermaid after clearing diagrams
			mermaid.initialize({ startOnLoad: false });
			return await parseMermaidToExcalidraw(diagram);
		}
		throw err;
	}
}

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	const { resolvedTheme } = useTheme();
	const { history, addHistory } = usePersistedHistory("drawHistory");
	const [selectedTimestamp, setSelectedTimestamp] = usePersistedSelection(
		history,
		"drawHistorySelection",
	);
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
				const { response, elements } = await generateDiagramVoice(payload);
				setOldElements(currentElements);
				setNewElements(elements);
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
	const [mermaidCode, setMermaidCode] = useState<string>("");
	const [currentElements, setCurrentElements] = useState<unknown[]>([]);
	const [oldElements, setOldElements] = useState<unknown[] | null>(null);
	const [newElements, setNewElements] = useState<unknown[] | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [lastVoicePayload, setLastVoicePayload] =
		useState<VoiceToDiagramMutationPayload | null>(null);
	const [newVersionKey, setNewVersionKey] = useState(0);
	const [isVoiceLoading, setIsVoiceLoading] = useState(false);

	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	// approval handlers
	const approve = () => {
		if (newElements && lastResponse) {
			const timestamp = Date.now();
			setCurrentElements(newElements);
			addHistory({ ...lastResponse, timestamp });
			setSelectedTimestamp(timestamp);
			setMermaidCode(lastResponse.diagram || mermaidCode);
		}
		setNewElements(null);
		setOldElements(null);
		setLastResponse(null);
	};
	const decline = () => {
		setNewElements(null);
		setOldElements(null);
		setLastResponse(null);
	};
	// retry handler: re-invoke the diagram endpoint with loading toast
	const retry = async () => {
		console.log("retry clicked", { lastVoicePayload, lastResponse });
		if (lastVoicePayload) {
			const toastId = toast.loading("Regenerating diagram...");
			try {
				const { response, elements } = await generateDiagramVoice({
					audioBlob: lastVoicePayload.audioBlob,
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setOldElements(currentElements);
				setNewElements(elements);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch {
				toast.error("Retry failed", { id: toastId });
			}
			return;
		}
		if (lastResponse) {
			const toastId = toast.loading("Regenerating diagram...");
			try {
				const { response, elements } = await generateDiagramText({
					instruction: lastResponse.instruction,
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setOldElements(currentElements);
				setNewElements(elements);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch {
				toast.error("Retry failed", { id: toastId });
			}
		}
	};

	/**
	 * Receives RPC results from InstructionModal: update scene directly without extra fetch
	 */
	const handleInstructionGenerated = ({
		response,
		elements,
	}: { response: DiagramResponse; elements: unknown[] }) => {
		setOldElements(currentElements);
		setNewElements(elements);
		setLastResponse(response);
		setIsModalOpen(false);
	};

	// render scene when history or selection changes
	useEffect(() => {
		if (history.length === 0) return;
		const ts =
			selectedTimestamp !== undefined
				? selectedTimestamp
				: history[history.length - 1].timestamp;
		const item =
			history.find((i) => i.timestamp === ts) || history[history.length - 1];
		const api = excalidrawAPIRef.current;
		if (!api) return;

		safeParseMermaidToExcalidraw(item.diagram).then((res) => {
			const excEl = convertToExcalidrawElements(res.elements);
			api.resetScene();
			api.updateScene({ elements: excEl });
			api.scrollToContent(excEl, { fitToContent: true });
			setMermaidCode(item.diagram);
			setCurrentElements(excEl);
		});
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
				{newElements ? (
					<DrawDiffView
						oldElements={oldElements || []}
						resolvedTheme={resolvedTheme}
						newVersionKey={newVersionKey}
						newElements={newElements}
						approve={approve}
						retry={retry}
						decline={decline}
					/>
				) : (
					<div className="flex-1 flex flex-col h-full">
						<div className="flex-1">
							<Excalidraw
								initialData={{ elements: currentElements, appState: {} }}
								excalidrawAPI={(api) => {
									excalidrawAPIRef.current = api;
								}}
								theme={resolvedTheme}
							/>
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
