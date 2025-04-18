import {
	Excalidraw,
	convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/useTheme";
import type { DiagramResponse } from "@/lib/queries";
import { voiceToDiagramMutationFn } from "@/lib/queries";
import type { VoiceToDiagramMutationPayload } from "@/lib/queries";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Loader2, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

function ExcalidrawWrapper({
	elements,
	theme,
	version,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
}: { elements: any[]; theme: "light" | "dark"; version: "current" | "new" }) {
	return (
		<Card className="flex flex-col flex-1 m-1">
			<CardHeader>
				<CardTitle>{version}</CardTitle>
			</CardHeader>
			<CardContent className="flex-1">
				<Excalidraw
					initialData={{ elements: elements, appState: {} }}
					theme={theme}
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
	voiceToDiagramMutation,
	micStatus,
}: {
	mermaidCode: string;
	setIsModalOpen: (open: boolean) => void;
	startRecording: () => void;
	stopRecording: () => void;
	voiceToDiagramMutation: UseMutationResult<
		DiagramResponse,
		Error,
		VoiceToDiagramMutationPayload,
		unknown
	>;
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
				disabled={voiceToDiagramMutation.isPending}
				aria-label={
					voiceToDiagramMutation.isPending
						? "Generating diagram"
						: micStatus === "recording"
							? "Stop recording"
							: "Start recording"
				}
			>
				{voiceToDiagramMutation.isPending ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : micStatus === "recording" ? (
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
		onStop: (_blobUrl, blob) => {
			// Automatically send recorded Blob on stop
			voiceToDiagramMutation.mutate({
				audioBlob: blob,
				existingDiagramCode: mermaidCode,
			});
		},
	});
	const [mermaidCode, setMermaidCode] = useState<string>("");
	// new approval states
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const [currentElements, setCurrentElements] = useState<any[]>([]);
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const [oldElements, setOldElements] = useState<any[] | null>(null);
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const [newElements, setNewElements] = useState<any[] | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	// History items with unique timestamp key
	type HistoryItem = DiagramResponse & { timestamp: number };
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	const voiceToDiagramMutation = useMutation<
		DiagramResponse,
		Error,
		VoiceToDiagramMutationPayload
	>({
		mutationFn: (payload) => voiceToDiagramMutationFn(payload),
		onMutate: () => {
			console.log("Voice-to-diagram mutation started");
		},
		onSuccess: (response) => {
			console.log("Voice-to-diagram response received", response);
			handleDiagramGenerated(response);
		},
		onError: (error) => {
			console.error("Voice-to-Diagram Mutation Error:", error);
			toast.error("Voice-to-Diagram Failed", { description: error.message });
		},
		onSettled: () => {},
	});

	const handleDiagramGenerated = async (response: DiagramResponse) => {
		try {
			const { diagram } = response;
			console.log(
				"Received Mermaid code:",
				diagram,
				"Instruction:",
				response.instruction,
			);

			const { elements: rawElements } = await parseMermaidToExcalidraw(diagram);
			const excalidrawElements = convertToExcalidrawElements(rawElements);
			// trigger approval workflow
			setOldElements(currentElements);
			setNewElements(excalidrawElements);
			setLastResponse(response);
			setIsModalOpen(false);
		} catch (error) {
			console.error(
				"Failed to parse Mermaid code received from backend:",
				error,
			);
			console.error("--- Failing Mermaid Code ---");
			console.error("--- End Failing Mermaid Code ---");
			toast.error("Diagram Generation Error", {
				description:
					"Failed to parse the generated diagram. The AI might have produced invalid code. Please try again.",
			});
		}
	};

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
													const { elements: rawElements } =
														await parseMermaidToExcalidraw(item.diagram);
													const excEl =
														convertToExcalidrawElements(rawElements);
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
						<header className="px-4 py-2 bg-card border-b flex justify-start space-x-2">
							<Button onClick={approve}>Approve</Button>
							<Button
								variant="destructive"
								onClick={decline}
								className="cursor-pointer"
							>
								Decline
							</Button>
						</header>
						<div className="flex-1 flex p-2">
							<ExcalidrawWrapper
								elements={oldElements || []}
								theme={resolvedTheme}
								version={"current"}
							/>
							<div className="flex flex-col flex-1 m-1">
								<ExcalidrawWrapper
									elements={newElements}
									theme={resolvedTheme}
									version={"new"}
								/>
							</div>
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
								voiceToDiagramMutation={voiceToDiagramMutation}
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
					onDiagramGenerated={handleDiagramGenerated}
					existingDiagramCode={mermaidCode}
				/>
			</main>
		</div>
	);
}
