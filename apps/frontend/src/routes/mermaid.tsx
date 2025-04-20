import { MermaidDiffView } from "@/components/custom/DiffView";
import { GenerationHeader } from "@/components/custom/GenerationHeader";
import { HistorySidebar } from "@/components/custom/HistorySidebar";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { usePersistedHistory } from "@/hooks/usePersistedHistory";
import { useTheme } from "@/hooks/useTheme";
import { generateDiagramText, generateDiagramVoice } from "@/lib/diagramFlow";
import type {
	DiagramResponse,
	VoiceToDiagramMutationPayload,
} from "@/lib/queries";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import mermaid from "mermaid";
import { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

mermaid.initialize({ startOnLoad: false });

export const Route = createFileRoute("/mermaid")({
	component: MermaidRouteComponent,
});

function MermaidRouteComponent() {
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
			setLastVoicePayload(payload);
			try {
				setIsVoiceLoading(true);
				const { response } = await generateDiagramVoice(payload);
				setOldCode(mermaidCode);
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

	const [mermaidCode, setOldCode] = useState("");
	const [newCode, setNewCode] = useState<string | null>(null);
	const [lastResponse, setLastResponse] = useState<DiagramResponse | null>(
		null,
	);
	const [lastVoicePayload, setLastVoicePayload] =
		useState<VoiceToDiagramMutationPayload | null>(null);
	const [newVersionKey, setNewVersionKey] = useState(0);
	const { history, addHistory } = usePersistedHistory("mermaidHistory");
	const [isVoiceLoading, setIsVoiceLoading] = useState(false);
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);

	const currentRef = useRef<HTMLDivElement>(null);
	const newRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// re-init mermaid with theme
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
		});
		// guard ref
		if (!currentRef.current) return;
		// clear container
		currentRef.current.innerHTML = "";
		if (!mermaidCode.trim()) return;
		const id = "mermaid-current";
		mermaid
			.render(id, mermaidCode)
			.then(({ svg, bindFunctions }) => {
				if (currentRef.current) {
					currentRef.current.innerHTML = svg;
					bindFunctions?.(currentRef.current);
				}
			})
			.catch((err) => console.error("Mermaid render failed:", err));
	}, [mermaidCode, resolvedTheme]);

	useEffect(() => {
		// re-init mermaid with theme
		mermaid.initialize({
			startOnLoad: false,
			theme: resolvedTheme === "dark" ? "dark" : "default",
		});
		if (!newRef.current) return;
		console.log("mermaid newRef effect:", {
			key: newVersionKey,
			code: newCode,
		});
		// clear container and skip empty
		newRef.current.innerHTML = "";
		if (!newCode) return;
		const id = `mermaid-new-${newVersionKey}`;
		mermaid
			.render(id, newCode)
			.then(({ svg, bindFunctions }) => {
				if (newRef.current) {
					newRef.current.innerHTML = svg;
					bindFunctions?.(newRef.current);
				}
			})
			.catch((err) => console.error("Mermaid render failed:", err));
	}, [newCode, newVersionKey, resolvedTheme]);

	const approve = () => {
		if (newCode && lastResponse) {
			setOldCode(newCode);
			addHistory({ ...lastResponse, timestamp: Date.now() });
		}
		setNewCode(null);
		setLastResponse(null);
	};

	const decline = () => {
		setNewCode(null);
		setLastResponse(null);
	};

	const retry = async () => {
		console.log("mermaid retry", { lastVoicePayload, lastResponse });
		if (lastVoicePayload) {
			const toastId = toast.loading("Regenerating diagram...");
			try {
				// include existingDiagramCode for context
				const { response } = await generateDiagramVoice(lastVoicePayload);
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setOldCode(mermaidCode);
				setNewCode(response.diagram);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch {
				toast.error("Voice retry failed, switching to text retry", {
					id: toastId,
				});
				// fallback to text retry next time
				setLastVoicePayload(null);
			}
			return;
		}
		console.log("mermaid text retry", { lastResponse, mermaidCode });
		if (lastResponse) {
			const toastId = toast.loading("Regenerating diagram...");
			try {
				const { response } = await generateDiagramText({
					instruction: `${lastResponse.instruction}\n\nPlease regenerate with slight variations`,
					existingDiagramCode: mermaidCode,
				});
				toast.success("Diagram regenerated", { id: toastId, duration: 1000 });
				setOldCode(mermaidCode);
				setNewCode(response.diagram);
				setNewVersionKey((k) => k + 1);
				setLastResponse(response);
			} catch (error) {
				console.error("Text retry failed:", error);
				toast.error("Retry failed", { id: toastId });
			}
		}
	};

	const handleInstructionGenerated = ({
		response,
	}: { response: DiagramResponse }) => {
		setOldCode(mermaidCode);
		setNewCode(response.diagram);
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
				<HistorySidebar
					history={history}
					isOpen={isSidebarOpen}
					onItemClick={(item) => {
						// revert to selected history entry
						setNewCode(null);
						setLastResponse(null);
						setOldCode(item.diagram);
					}}
				/>
			</aside>
			<main className="flex-1 flex flex-col h-full">
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
						<header className="px-4 py-2 bg-card border-b">
							<GenerationHeader
								mermaidCode={mermaidCode}
								setIsModalOpen={setIsModalOpen}
								startRecording={startRecording}
								stopRecording={stopRecording}
								micStatus={micStatus}
								isVoiceLoading={isVoiceLoading}
							/>
						</header>
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
