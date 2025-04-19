import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateDiagramText, generateDiagramVoice } from "@/lib/diagramFlow";
import type {
	DiagramResponse,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Mic, RefreshCw, Square, X } from "lucide-react";
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
		container.innerHTML = `<div class="mermaid">${oldCode}</div>`;
		mermaid.run();
	}, [oldCode]);

	useEffect(() => {
		if (!newCode || !newRef.current) return;
		const container = newRef.current;
		container.innerHTML = `<div class="mermaid">${newCode}</div>`;
		mermaid.run();
	}, [newCode]);

	// Render accepted diagram in main view when preview is closed
	useEffect(() => {
		if (newCode !== null || !mermaidCode || !newRef.current) return;
		const container = newRef.current;
		container.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
		mermaid.run();
	}, [mermaidCode, newCode]);

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
					<div className="flex-1 flex">
						<div className="w-1/2 p-2" ref={currentRef} />
						<div className="w-1/2 p-2">
							<div ref={newRef} />
							<div className="flex space-x-2 mt-2">
								<Button variant="ghost" onClick={approve}>
									<Check />
								</Button>
								<Button variant="ghost" onClick={retry}>
									<RefreshCw />
								</Button>
								<Button variant="ghost" onClick={decline}>
									<X />
								</Button>
							</div>
						</div>
					</div>
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
