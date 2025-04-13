import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { drawMutationFn } from "../../lib/queries";

interface InstructionModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiagramGenerated: (mermaidCode: string) => void;
	existingDiagramCode?: string;
}

export function InstructionModal({
	open,
	onOpenChange,
	onDiagramGenerated,
	existingDiagramCode,
}: InstructionModalProps) {
	const [instruction, setInstruction] = useState("");

	const drawMutation = useMutation({
		mutationFn: drawMutationFn,
		onSuccess: (data) => {
			onDiagramGenerated(data);
		},
		onError: (error) => {
			console.error("Mutation Error:", error);
			alert(`Error generating/updating diagram: ${error.message}`);
		},
	});

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const trimmedInstruction = instruction.trim();
		if (!trimmedInstruction) return;

		drawMutation.mutate({
			instruction: trimmedInstruction,
			existingDiagramCode,
		});
	};

	const isUpdate = !!existingDiagramCode;
	const titleText = isUpdate ? "Update Diagram" : "Generate Diagram";
	const descriptionText = isUpdate
		? "Enter instructions to modify the existing diagram."
		: "Enter instructions for the diagram you want to generate.";
	const buttonText = drawMutation.isPending
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
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{titleText}</DialogTitle>
					<DialogDescription>{descriptionText}</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor="instruction" className="text-right">
								Instruction
							</Label>
							<Input
								id="instruction"
								value={instruction}
								onChange={(e) => setInstruction(e.target.value)}
								className="col-span-3"
								placeholder={placeholderText}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={drawMutation.isPending}>
							{buttonText}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
