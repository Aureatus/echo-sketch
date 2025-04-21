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
import { createFileRoute } from "@tanstack/react-router";
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
	const [selectedTimestamp, setSelectedTimestamp] = usePersistedSelection(
		history,
		"mermaidHistorySelection",
	);

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

	// initialize code when history or selection changes
	useEffect(() => {
		if (history.length === 0) return;
		const ts = selectedTimestamp ?? history[history.length - 1].timestamp;
		const item =
			history.find((i) => i.timestamp === ts) || history[history.length - 1];
		setOldCode(item.diagram);
	}, [history, selectedTimestamp]);

	const approve = () => {
		if (newCode && lastResponse) {
			addHistory({ ...lastResponse, timestamp: Date.now() });
			setSelectedTimestamp(Date.now());
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
