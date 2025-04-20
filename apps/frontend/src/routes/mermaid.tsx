import { MermaidDiffView } from "@/components/custom/DiffView";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/useTheme";
import { generateDiagramText, generateDiagramVoice } from "@/lib/diagramFlow";
import type {
	DiagramResponse,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, Square } from "lucide-react";
import { Loader2 } from "lucide-react";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

// Initialize mermaid without auto start
mermaid.initialize({ startOnLoad: false });

// mermaid initialized elsewhere

type HistoryItem = { instruction: string; diagram: string; timestamp: number };

export const Route = createFileRoute("/mermaid")({
	component: MermaidRouteComponent,
});

function MermaidRouteComponent() {
	const { resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [mermaidCode, setMermaidCode] = useState("");
	const [oldCode, setOldCode] = useState<string | null>(null);
	const [newCode, setNewCode] = useState<string | null>(null);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [isVoiceLoading, setIsVoiceLoading] = useState(false);

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
		onStop: async (_url, blob) => {
			const payload: VoiceToDiagramMutationPayload = {
				audioBlob: blob,
				existingDiagramCode: mermaidCode,
			};
			try {
				setIsVoiceLoading(true);
				const { response } = await generateDiagramVoice(payload);
				// elements unused
				handleInstructionGenerated({ response });
			} catch (e) {
				toast.error("Voice generation failed");
			} finally {
				setIsVoiceLoading(false);
			}
		},
	});

	const currentRef = useRef<HTMLDivElement>(null);
	const newRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!oldCode || !currentRef.current) return;
		const container = currentRef.current;
		container.innerHTML = `<div class="mermaid selection:bg-blue-200 selection:text-black dark:selection:bg-gray-600 dark:selection:text-white">${oldCode}</div>`;
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
			themeVariables: {
				textColor: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
			},
		});
		mermaid.run();
	}, [oldCode, resolvedTheme]);

	useEffect(() => {
		if (!newCode || !newRef.current) return;
		const container = newRef.current;
		container.innerHTML = `<div class="mermaid selection:bg-blue-200 selection:text-black dark:selection:bg-gray-600 dark:selection:text-white">${newCode}</div>`;
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
			themeVariables: {
				textColor: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
			},
		});
		mermaid.run();
	}, [newCode, resolvedTheme]);

	// Render accepted diagram in main view when preview is closed
	useEffect(() => {
		if (newCode !== null || !mermaidCode || !newRef.current) return;
		const container = newRef.current;
		container.innerHTML = `<div class="mermaid selection:bg-blue-200 selection:text-black dark:selection:bg-gray-600 dark:selection:text-white">${mermaidCode}</div>`;
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
			themeVariables: {
				textColor: resolvedTheme === "dark" ? "#e5e7eb" : "#111827",
			},
		});
		mermaid.run();
	}, [mermaidCode, newCode, resolvedTheme]);

	const generate = async (instruction: string) => {
		setOldCode(mermaidCode || null);
		try {
			const { response } = await generateDiagramText({ instruction });
			const code = response.diagram;
			setNewCode(code);
			setLastResponse(response);
			setMermaidCode(code);
			setHistory((h) => [
				...h,
				{ instruction, diagram: code, timestamp: Date.now() },
			]);
		} catch {
			toast.error("Diagram generation failed");
		}
	};

	const approve = () => {
		setOldCode(null);
		setNewCode(null);
	};

	const decline = () => {
		setNewCode(null);
	};

	const retry = () => {
		if (lastResponse) {
			// Retry with previous instruction
			generate(lastResponse.instruction);
			toast.loading("Retrying diagram...");
		}
	};

	const handleInstructionGenerated = ({
		response,
	}: { response: DiagramResponse }) => {
		// use instruction from lastResponse
		const instruction = lastResponse?.instruction || "";
		const code = response.diagram;
		setOldCode(mermaidCode);
		setNewCode(code);
		setLastResponse(response);
		setMermaidCode(code);
		setHistory((h) => [
			...h,
			{ instruction, diagram: code, timestamp: Date.now() },
		]);
		setIsModalOpen(false);
	};

	return (
		<div className="flex h-full">
			<aside className="w-64 flex-shrink-0 flex flex-col p-2 bg-card text-card-foreground border-r">
				<div className="flex justify-end mb-2">
					{/* Sidebar toggle omitted */}
				</div>
				<Card className="flex flex-col flex-1">
					<CardHeader>
						<CardTitle>History</CardTitle>
					</CardHeader>
					<CardContent className="p-2">
						<ScrollArea className="h-full">
							<ul>
								{history.map((item) => (
									<li key={item.timestamp}>
										<Button
											variant="link"
											onClick={() => {
												setMermaidCode(item.diagram);
												setOldCode(null);
												setNewCode(null);
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
			</aside>
			<main className="flex-1 flex flex-col">
				{newCode ? (
					<MermaidDiffView
						currentRef={currentRef}
						newRef={newRef}
						approve={approve}
						retry={retry}
						decline={decline}
					/>
				) : (
					<>
						<header className="px-4 py-2 bg-card border-b flex items-center">
							<Button onClick={() => setIsModalOpen(true)}>
								Generate Diagram
							</Button>
							<Button
								type="button"
								onClick={() =>
									micStatus === "recording" ? stopRecording() : startRecording()
								}
								disabled={isVoiceLoading || micStatus === "recording"}
								className="ml-2"
							>
								{isVoiceLoading ? (
									<Loader2 className="animate-spin" />
								) : micStatus === "recording" ? (
									<Square />
								) : (
									<Mic />
								)}
							</Button>
						</header>
						<div className="flex-1 p-4">
							{mermaidCode && <div ref={newRef} />}
						</div>
					</>
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
