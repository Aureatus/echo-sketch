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
import { useEffect, useRef, useState } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { generateDiagramText } from "../../lib/diagramFlow";
import type { DiagramResponse, DrawMutationPayload } from "../../lib/queries";

interface InstructionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiagramGenerated: (payload: {
		response: DiagramResponse;
		elements: unknown[];
	}) => void;
	existingDiagramCode?: string;
}

export function InstructionModal({
	open,
	onOpenChange,
	onDiagramGenerated,
	existingDiagramCode,
}: InstructionModalProps) {
	const [instruction, setInstruction] = useState("");
	const formRef = useRef<HTMLFormElement>(null);
	const reactQuillRef = useRef<ReactQuill>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [hasError, setHasError] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setHasError(false);
		const trimmed = instruction.trim();
		if (!trimmed) return;
		const payload: DrawMutationPayload = {
			instruction: trimmed,
			existingDiagramCode,
		};
		setIsLoading(true);
		try {
			const { response, elements } = await generateDiagramText(payload);
			onDiagramGenerated({ response, elements });
			setInstruction("");
			onOpenChange(false);
		} catch (error: unknown) {
			setHasError(true);
		} finally {
			setIsLoading(false);
		}
	};

	const isUpdate = !!existingDiagramCode;
	const titleText = isUpdate ? "Update Diagram" : "Generate Diagram";
	const descriptionText = isUpdate
		? "Enter instructions to modify the diagram."
		: "Enter instructions for the diagram.";
	const placeholderText = isUpdate
		? "e.g., Change NodeA to TaskA"
		: "e.g., Sequence diagram for login flow";

	// enable body scroll when modal is open
	useEffect(() => {
		document.body.style.overflow = open ? "auto" : "";
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const editor = reactQuillRef.current?.getEditor().root;
		if (editor) {
			editor.style.height = "auto";
			editor.style.height = `${editor.scrollHeight}px`;
		}
	}, [open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-full !max-w-none sm:!max-w-none md:!max-w-6xl max-h-[100vh] overflow-auto">
				<DialogHeader>
					<DialogTitle>{titleText}</DialogTitle>
					<DialogDescription>{descriptionText}</DialogDescription>
				</DialogHeader>
				<form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="instruction">Instructions</Label>
						<ReactQuill
							ref={reactQuillRef}
							id="instruction"
							theme="snow"
							value={instruction}
							onChange={(value: string) => {
								setInstruction(value);
								if (hasError) setHasError(false);
								// auto-grow
								const editor = reactQuillRef.current?.getEditor().root;
								if (editor) {
									editor.style.height = "auto";
									editor.style.height = `${editor.scrollHeight}px`;
									// auto-width
									editor.style.width = `${editor.scrollWidth}px`;
								}
							}}
							placeholder={placeholderText}
							modules={{
								toolbar: [
									"bold",
									"italic",
									"underline",
									"strike",
									"blockquote",
									"code-block",
									{ list: "ordered" },
									{ list: "bullet" },
									"link",
									"image",
								],
								keyboard: {
									bindings: {
										submit: {
											key: 13,
											shortKey: true,
											handler: () => formRef.current?.requestSubmit(),
										},
									},
								},
							}}
							className="w-full border border-input rounded-md px-3 py-2 [&_.ql-editor]:overflow-auto [&_.ql-editor]:max-h-[60vh] [&_.ql-editor]:whitespace-pre-wrap [&_.ql-editor]:break-words [&_.ql-editor]:break-all [&_.ql-editor]:min-h-[12rem]"
						/>
						<p className="text-sm text-muted-foreground mt-1">
							Use the toolbar above or type your instructions. Press Ctrl+Enter
							or Cmd+Enter to submit
						</p>
					</div>
					<DialogFooter>
						<div className="flex w-full items-center justify-start space-x-4">
							<Button type="submit" disabled={isLoading || hasError}>
								{isLoading
									? isUpdate
										? "Updating..."
										: "Generating..."
									: isUpdate
										? "Update Diagram"
										: "Generate Diagram"}
							</Button>
						</div>
						{hasError && (
							<p className="mt-2 text-sm text-red-600">
								Failed after multiple attempts. Please adjust your prompt.
							</p>
						)}
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
