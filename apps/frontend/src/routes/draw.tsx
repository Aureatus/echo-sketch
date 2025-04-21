import {
	Excalidraw,
	convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute, useLoaderData } from "@tanstack/react-router";
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
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

// loader: fetch last diagram and parse to excalidraw elements
async function drawLoader() {
	const stored = localStorage.getItem("drawHistory");
	const history = stored ? JSON.parse(stored) : [];
	const last = history.length > 0 ? history[history.length - 1] : null;
	if (!last) return { initialElements: [], initialDiagram: "" };
	const parsed = await safeParseMermaidToExcalidraw(last.diagram);
	const excEl = convertToExcalidrawElements(parsed.elements);
	return { initialElements: excEl, initialDiagram: last.diagram };
}

export const Route = createFileRoute("/draw")({
	loader: drawLoader,
	component: DrawRouteComponent,
});

// Infer the elements type from Excalidraw component props
type ElementsType = React.ComponentProps<
	typeof Excalidraw
>["initialData"]["elements"];

function DrawRouteComponent() {
	const { initialElements, initialDiagram } = useLoaderData({
		from: "/draw",
		strict: true,
	});
	const { resolvedTheme } = useTheme();
	const { history, addHistory } = usePersistedHistory("drawHistory");
	const [selectedTimestamp, setSelectedTimestamp] = usePersistedSelection(
		history,
		"drawHistorySelection",
	);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isHistoryOpen, setIsHistoryOpen] = useState(false);
	const [mermaidCode, setMermaidCode] = useState<string>(initialDiagram);
	const [currentElements, setCurrentElements] =
		useState<ElementsType>(initialElements);
	const [oldElements, setOldElements] = useState<ElementsType | null>(null);
	const [newElements, setNewElements] = useState<ElementsType | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [lastVoicePayload, setLastVoicePayload] =
		useState<VoiceToDiagramMutationPayload | null>(null);
	const [newVersionKey, setNewVersionKey] = useState(0);
	const [isVoiceLoading, setIsVoiceLoading] = useState(false);

	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	// State Update Handlers
	const showDiff = useCallback(
		(response: DiagramResponse, elements: ElementsType) => {
			setOldElements(currentElements);
			setNewElements(elements);
			setLastResponse(response);
			setNewVersionKey((k) => k + 1);
			setIsModalOpen(false);
			if (!("audioBlob" in response)) {
				setLastVoicePayload(null);
			}
		},
		[currentElements],
	);

	const approve = useCallback(() => {
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
		setLastVoicePayload(null);
	}, [
		newElements,
		lastResponse,
		addHistory,
		setSelectedTimestamp,
		mermaidCode,
	]);

	const decline = useCallback(() => {
		setNewElements(null);
		setOldElements(null);
		setLastResponse(null);
		setLastVoicePayload(null);
	}, []);

	const retry = useCallback(async () => {
		const codeForRetryContext = mermaidCode;

		console.log("draw retry", {
			lastVoicePayload,
			lastResponse,
			codeForRetryContext,
		});

		if (lastVoicePayload) {
			const toastId = toast.loading("Regenerating diagram (voice)...");
			try {
				const { response, elements } = await generateDiagramVoice({
					...lastVoicePayload,
					existingDiagramCode: codeForRetryContext,
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setNewElements(elements);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch (error) {
				console.error("Voice retry failed:", error);
				toast.error("Voice retry failed", { id: toastId });
			}
			return;
		}
		if (lastResponse) {
			const toastId = toast.loading("Regenerating diagram (text)...");
			try {
				const { response, elements } = await generateDiagramText({
					instruction: `${lastResponse.instruction}\n\nPlease regenerate with slight variations`,
					existingDiagramCode: codeForRetryContext,
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setNewElements(elements);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch (error) {
				console.error("Text retry failed:", error);
				toast.error("Retry failed", { id: toastId });
			}
		}
	}, [mermaidCode, lastVoicePayload, lastResponse]);

	const handleInstructionGenerated = useCallback(
		({
			response,
			elements,
		}: { response: DiagramResponse; elements: ElementsType }) => {
			showDiff(response, elements);
			setLastVoicePayload(null);
		},
		[showDiff],
	);

	// Voice Stop Handler
	const handleVoiceStop = useCallback(
		async (_blobUrl: string, blob: Blob) => {
			const payload: VoiceToDiagramMutationPayload = {
				audioBlob: blob,
				existingDiagramCode: mermaidCode,
			};
			setLastVoicePayload(payload);
			const toastId = toast.loading("Generating diagram from voice...");
			setIsVoiceLoading(true);
			try {
				const { response, elements } = await generateDiagramVoice(payload);
				toast.success("Diagram generated", { id: toastId, duration: 1000 });
				showDiff(response, elements);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				console.error("Voice-to-Diagram Failed:", error);
				toast.error("Voice-to-Diagram Failed", {
					id: toastId,
					description: msg,
				});
				setLastVoicePayload(null);
			} finally {
				setIsVoiceLoading(false);
			}
		},
		[mermaidCode, showDiff],
	);

	// Now call the hook that uses handleVoiceStop
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

	// Effects
	useEffect(() => {
		const api = excalidrawAPIRef.current;

		if (history.length === 0) {
			setCurrentElements([]);
			setMermaidCode("");
			api?.resetScene();
			return;
		}
		const ts =
			selectedTimestamp !== undefined
				? selectedTimestamp
				: history[history.length - 1].timestamp;
		const item =
			history.find((i) => i.timestamp === ts) || history[history.length - 1];

		if (!api || !item) return;

		setNewElements(null);
		setOldElements(null);
		setLastResponse(null);
		setLastVoicePayload(null);

		safeParseMermaidToExcalidraw(item.diagram)
			.then((res) => {
				const excEl = convertToExcalidrawElements(res.elements) as ElementsType;
				api.updateScene({ elements: excEl });
				api.scrollToContent(excEl.length > 0 ? excEl : undefined, {
					fitToContent: true,
				});
				setCurrentElements(excEl);
				setMermaidCode(item.diagram);
			})
			.catch((error) => {
				console.error("Failed to parse history item for Excalidraw:", error);
				toast.error("Failed to load diagram from history.");
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
