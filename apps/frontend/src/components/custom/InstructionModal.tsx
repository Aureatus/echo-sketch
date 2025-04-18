import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { Mic, RotateCcw, Square } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { drawMutationFn, voiceToDiagramMutationFn } from "../../lib/queries";
import type {
	DiagramResponse,
	DrawMutationPayload,
	VoiceToDiagramMutationPayload,
} from "../../lib/queries";

interface InstructionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiagramGenerated: (response: DiagramResponse) => void;
	existingDiagramCode?: string;
}

export function InstructionModal({
	open,
	onOpenChange,
	onDiagramGenerated,
	existingDiagramCode,
}: InstructionModalProps) {
	const [instruction, setInstruction] = useState("");
	const [isRecording, setIsRecording] = useState(false);
	const [isTranscribing, setIsTranscribing] = useState(false);
	// Remove drawTriggeredByVoice, not needed in new flow
	// const [drawTriggeredByVoice, setDrawTriggeredByVoice] = useState(false);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const formRef = useRef<HTMLFormElement>(null);

	const drawMutation = useMutation<DiagramResponse, Error, DrawMutationPayload>(
		{
			mutationFn: drawMutationFn,
			onSuccess: (response) => {
				onDiagramGenerated(response);
				setInstruction("");
			},
			onError: (error) => {
				console.error("Draw Mutation Error:", error);
				toast.error("Diagram Generation Failed", {
					description: error.message,
				});
			},
			onSettled: () => {
				setIsTranscribing(false); // Reset voice trigger flag
			},
		},
	);

	const voiceToDiagramMutation = useMutation<
		DiagramResponse,
		Error,
		VoiceToDiagramMutationPayload
	>({
		mutationFn: (payload: VoiceToDiagramMutationPayload) =>
			voiceToDiagramMutationFn(payload),
		onMutate: () => {
			setIsTranscribing(true);
			setInstruction("Processing audio...");
		},
		onSuccess: (response) => {
			console.log("Voice-to-diagram result:", response);
			toast.success("Diagram generated from voice!");
			setInstruction("");
			onDiagramGenerated(response);
		},
		onError: (error: Error) => {
			console.error("Voice-to-Diagram Mutation Error:", error);
			toast.error("Voice-to-Diagram Failed", {
				description: error.message,
			});
			setInstruction("");
		},
		onSettled: () => {
			setIsTranscribing(false);
			setIsRecording(false);
			mediaRecorderRef.current = null;
			audioChunksRef.current = [];
		},
	});

	const handleMicClick = async () => {
		if (isRecording) {
			// Flush any buffered audio data before stopping
			mediaRecorderRef.current?.requestData();
			mediaRecorderRef.current?.stop();
		} else {
			if (!navigator.mediaDevices?.getUserMedia) {
				toast.error("Audio Recording Not Supported", {
					description: "Your browser does not support audio recording.",
				});
				return;
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
				});
				mediaRecorderRef.current = new MediaRecorder(stream);
				audioChunksRef.current = [];

				mediaRecorderRef.current.ondataavailable = (event) => {
					if (event.data.size > 0) {
						audioChunksRef.current.push(event.data);
					}
				};

				mediaRecorderRef.current.onstop = () => {
					const audioBlob = new Blob(audioChunksRef.current, {
						type: "audio/webm",
					});
					voiceToDiagramMutation.mutate({ audioBlob, existingDiagramCode });

					// Stop mic access tracks
					for (const track of stream.getTracks()) {
						track.stop();
					}
				};

				mediaRecorderRef.current.start();
				setIsRecording(true);
				setInstruction("Recording...");
				toast.info("Recording started...");
			} catch (err) {
				let message =
					"An unknown error occurred while accessing the microphone.";
				if (err instanceof Error) {
					if (
						err.name === "NotAllowedError" ||
						err.name === "PermissionDeniedError"
					) {
						message =
							"Microphone access denied. Please allow microphone permissions in your browser settings.";
					} else if (
						err.name === "NotFoundError" ||
						err.name === "DevicesNotFoundError"
					) {
						message =
							"No microphone found. Please ensure a microphone is connected and enabled.";
					} else {
						message = `Error accessing microphone: ${err.message}`;
					}
				}
				console.error("Error accessing microphone:", err);
				toast.error("Microphone Error", {
					description: message,
				});
			}
		}
	};

	const handleReset = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.onstop = null;
			mediaRecorderRef.current.stop();
		}
		audioChunksRef.current = [];
		setIsRecording(false);
		setIsTranscribing(false);
		setInstruction("");
		// Reset UI state
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (isRecording || isTranscribing) return;

		const trimmedInstruction = instruction.trim();
		if (!trimmedInstruction || trimmedInstruction === "Recording...") return;

		drawMutation.mutate({
			instruction: trimmedInstruction,
			existingDiagramCode,
		});
	};

	const isBusy =
		isRecording ||
		isTranscribing ||
		drawMutation.isPending ||
		voiceToDiagramMutation.isPending;

	const isUpdate = !!existingDiagramCode;
	const titleText = isUpdate ? "Update Diagram" : "Generate Diagram";
	const descriptionText = isUpdate
		? "Enter instructions or use the mic to modify the diagram."
		: "Enter instructions or use the mic for the diagram.";
	const submitButtonText = drawMutation.isPending
		? isUpdate
			? "Updating..."
			: "Generating..."
		: isUpdate
			? "Update Diagram"
			: "Generate Diagram";
	const placeholderText = isUpdate
		? "e.g., Change NodeA to TaskA"
		: "e.g., Sequence diagram for login flow";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-full max-w-3xl max-h-[80vh] overflow-auto">
				<DialogHeader>
					<DialogTitle>{titleText}</DialogTitle>
					<DialogDescription>{descriptionText}</DialogDescription>
				</DialogHeader>
				<form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instruction">Instructions</Label>
						<textarea
							id="instruction"
							value={instruction}
							onChange={(e) => setInstruction(e.target.value)}
							placeholder={placeholderText}
							disabled={isRecording || isTranscribing}
							rows={5}
							className="w-full min-h-[6rem] resize-y border border-input rounded-md px-3 py-2 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
									e.preventDefault();
									formRef.current?.requestSubmit();
								}
							}}
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Press Ctrl+Enter or (Cmd+Enter) to submit
						</p>
					</div>
					<div className="grid grid-cols-5 items-end gap-2">
						<div className="col-span-1 flex justify-center">
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleMicClick}
								disabled={isTranscribing}
								className={isRecording ? "animate-pulse border-red-500" : ""}
								aria-label={isRecording ? "Stop recording" : "Start recording"}
							>
								{isRecording ? (
									<Square className="h-4 w-4 text-red-500 fill-red-500" />
								) : (
									<Mic className="h-4 w-4" />
								)}
							</Button>
						</div>
						<div className="col-span-1 flex justify-center">
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleReset}
								disabled={!isRecording && !isTranscribing}
								aria-label="Reset recording"
							>
								<RotateCcw className="h-4 w-4" />
							</Button>
						</div>
					</div>
					{isTranscribing && (
						<p className="text-sm text-muted-foreground text-center col-span-full">
							Generating diagram from audio...
						</p>
					)}
					<DialogFooter>
						<Button type="submit" disabled={isBusy}>
							{submitButtonText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
