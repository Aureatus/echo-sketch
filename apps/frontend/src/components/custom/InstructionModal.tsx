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
}

export function InstructionModal({
	open,
	onOpenChange,
	onDiagramGenerated,
}: InstructionModalProps) {
	const [instruction, setInstruction] = useState("");

	const drawMutation = useMutation({
		mutationFn: drawMutationFn,
		onSuccess: (data) => {
			onDiagramGenerated(data);
			onOpenChange(false);
			setInstruction("");
		},
		onError: (error) => {
			console.error("Mutation Error:", error);
			alert(`Error: ${error.message}`);
		},
	});

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (!instruction.trim()) return;
		drawMutation.mutate({ instruction });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Generate Diagram</DialogTitle>
					<DialogDescription>
						Enter instructions for the diagram you want to generate.
					</DialogDescription>
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
								placeholder="e.g., Sequence diagram for login flow"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={drawMutation.isPending}>
							{drawMutation.isPending ? "Generating..." : "Generate"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
