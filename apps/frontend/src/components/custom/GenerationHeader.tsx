import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "../ui/button";

export function MermaidGenerationHeader({
	setIsModalOpen,
	micStatus,
	isVoiceLoading,
	startRecording,
	stopRecording,
}: {
	setIsModalOpen: (open: boolean) => void;
	micStatus: string;
	isVoiceLoading: boolean;
	startRecording: () => void;
	stopRecording: () => void;
}) {
	return (
		<header className="px-4 py-2 bg-card border-b flex items-center">
			<Button onClick={() => setIsModalOpen(true)}>Generate Diagram</Button>
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
	);
}

export function DrawGenerationHeader({
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
	const micDisabled = micStatus === "recording" || isVoiceLoading;
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
