import { Excalidraw } from "@excalidraw/excalidraw";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/useTheme";
import { generateDiagramVoice } from "@/lib/diagramFlow";
import type {
	DiagramResponse,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Check, ChevronLeft, ChevronRight, Mic, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

function ExcalidrawWrapper({
	elements,
	theme,
	version,
	children,
}: {
	elements: unknown[];
	theme: "light" | "dark";
	version: "current" | "new";
	children?: React.ReactNode;
}) {
	return (
		<Card className="flex flex-col flex-1 m-1">
			<CardHeader className="flex justify-between items-center">
				<CardTitle>{version}</CardTitle>
				{version === "new" && children}
			</CardHeader>
			<CardContent className="flex-1">
				<Excalidraw
					initialData={{
						elements,
						appState:
							version === "new"
								? { backgroundColor: "#dcfce7", viewBackgroundColor: "#dcfce7" }
								: {},
					}}
					theme={version === "new" ? "light" : theme}
					viewModeEnabled={true}
					zenModeEnabled={true}
					UIOptions={{
						canvasActions: {
							changeViewBackgroundColor: false,
							loadScene: false,
							clearCanvas: false,
							export: false,
							saveAsImage: false,
							saveToActiveFile: false,
							toggleTheme: false,
						},
						tools: { image: false },
					}}
				/>
			</CardContent>
		</Card>
	);
}

function CustomHeader({
	mermaidCode,
	setIsModalOpen,
	startRecording,
	stopRecording,
	micStatus,
}: {
	mermaidCode: string;
	setIsModalOpen: (open: boolean) => void;
	startRecording: () => void;
	stopRecording: () => void;
	micStatus: string;
}) {
	const buttonText = mermaidCode ? "Update Diagram" : "Generate Diagram";
	return (
		<div className="flex items-center space-x-2 mr-2">
			<Button onClick={() => setIsModalOpen(true)}>{buttonText}</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				onClick={() =>
					micStatus === "recording" ? stopRecording() : startRecording()
				}
				disabled={micStatus === "recording"}
				aria-label={
					micStatus === "recording" ? "Stop recording" : "Start recording"
				}
			>
				{micStatus === "recording" ? (
					<Square className="h-4 w-4 text-red-500 fill-red-500" />
				) : (
					<Mic className="h-4 w-4" />
				)}
			</Button>
		</div>
	);
}

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	const { resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
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
			try {
				const { response, elements } = await generateDiagramVoice(payload);
				setOldElements(currentElements);
				setNewElements(elements);
				setLastResponse(response);
				setIsModalOpen(false);
			} catch (error: unknown) {
				const msg = error instanceof Error ? error.message : String(error);
				toast.error("Voice-to-Diagram Failed", { description: msg });
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
	// History items with unique timestamp key
	type HistoryItem = DiagramResponse & { timestamp: number };
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	// approval handlers
	const approve = () => {
		if (newElements) {
			setCurrentElements(newElements);
			if (lastResponse)
				setHistory((prev) => [
					...prev,
					{ ...lastResponse, timestamp: Date.now() },
				]);
			setMermaidCode(lastResponse?.diagram || mermaidCode);
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

	return (
		<div className="flex h-full">
			<aside
				className={`${isSidebarOpen ? "w-64" : "w-16"} flex-shrink-0 flex flex-col h-full p-2 bg-card text-card-foreground border-r border-border`}
			>
				<div className="flex justify-end mb-2">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsSidebarOpen((prev) => !prev)}
					>
						{isSidebarOpen ? <ChevronLeft /> : <ChevronRight />}
					</Button>
				</div>
				{isSidebarOpen && (
					<Card className="flex flex-col flex-1">
						<CardHeader>
							<CardTitle>History</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 p-0">
							<ScrollArea className="h-full p-2 w-full">
								<ul className="space-y-2">
									{history.map((item) => (
										<li key={item.timestamp}>
											<Button
												variant="link"
												size="default"
												className="w-full justify-start p-0 whitespace-normal break-words"
												onClick={async () => {
													const api = excalidrawAPIRef.current;
													if (!api) return;
													const result = await parseMermaidToExcalidraw(
														item.diagram,
													);
													const excEl = convertToExcalidrawElements(
														result.elements,
													);
													api.resetScene();
													api.updateScene({ elements: excEl });
													api.scrollToContent(excEl, { fitToContent: true });
													setMermaidCode(item.diagram);
												}}
											>
												{item.instruction}
											</Button>
										</li>
									))}
								</ul>
							</ScrollArea>
						</CardContent>
					</Card>
				)}
			</aside>
			<main className="flex-1 flex flex-col h-full">
				{newElements ? (
					<div className="flex-1 flex flex-col h-full">
						<div className="flex-1 flex p-2">
							<ExcalidrawWrapper
								elements={oldElements || []}
								theme={resolvedTheme}
								version={"current"}
							/>
							<ExcalidrawWrapper
								elements={newElements}
								theme={resolvedTheme}
								version={"new"}
							>
								<div className="flex space-x-2">
									<Button
										variant="ghost"
										size="icon"
										onClick={approve}
										className="text-green-500"
									>
										<Check className="w-8 h-8" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={decline}
										className="text-red-500"
									>
										<X className="w-8 h-8" />
									</Button>
								</div>
							</ExcalidrawWrapper>
						</div>
					</div>
				) : (
					<div className="flex-1 flex flex-col h-full">
						<header className="px-4 py-2 bg-card border-b">
							<CustomHeader
								mermaidCode={mermaidCode}
								setIsModalOpen={setIsModalOpen}
								startRecording={startRecording}
								stopRecording={stopRecording}
								micStatus={micStatus}
							/>
						</header>
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
