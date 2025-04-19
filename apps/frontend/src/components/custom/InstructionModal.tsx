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
import { useRef, useState } from "react";
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
							onChange={(e) => {
								setInstruction(e.target.value);
								if (hasError) setHasError(false);
							}}
							placeholder={placeholderText}
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
							{hasError && (
								<p className="text-sm text-red-600">
									Failed after multiple attempts. Please adjust your prompt.
								</p>
							)}
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
