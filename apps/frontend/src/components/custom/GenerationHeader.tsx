import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "../ui/button";

export function GenerationHeader({
	mermaidCode,
	setIsModalOpen,
	startRecording,
	stopRecording,
	micStatus,
	isVoiceLoading,
}: {
	mermaidCode: string;
	setIsModalOpen: (open: boolean) => void;
	startRecording: () => void;
	stopRecording: () => void;
	micStatus: string;
	isVoiceLoading: boolean;
}) {
	const buttonText = mermaidCode ? "Update Diagram" : "Generate Diagram";
	const micDisabled = isVoiceLoading;
	const micLabel = isVoiceLoading
		? "Generating diagram..."
		: micStatus === "recording"
			? "Stop recording"
			: "Start recording";
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
				disabled={micDisabled}
				aria-label={micLabel}
			>
				{isVoiceLoading ? (
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
