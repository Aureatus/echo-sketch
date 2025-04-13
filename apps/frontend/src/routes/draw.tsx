import {
	Excalidraw,
	convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useRef, useState } from "react";

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	const { resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);

	const handleDiagramGenerated = async (code: string) => {
		console.log("Received Mermaid code:", code);

		const api = excalidrawAPIRef.current;
		if (!api) {
			console.error("Excalidraw API not available yet.");
			return;
		}

		try {
			const { elements: rawElements } = await parseMermaidToExcalidraw(code);
			const excalidrawElements = convertToExcalidrawElements(rawElements);
			api.resetScene();
			api.updateScene({ elements: excalidrawElements });
			api.scrollToContent(excalidrawElements, { fitToContent: true });
		} catch (error) {
			console.error("Failed to parse Mermaid to Excalidraw:", error);
		}
	};

	return (
		<div style={{ height: "90vh" }}>
			<Excalidraw
				excalidrawAPI={(api) => {
					excalidrawAPIRef.current = api;
				}}
				theme={resolvedTheme}
				renderTopRightUI={() => {
					return (
						<Button onClick={() => setIsModalOpen(true)} className="mr-2">
							Generate Diagram
						</Button>
					);
				}}
			/>
			<InstructionModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				onDiagramGenerated={handleDiagramGenerated}
			/>
		</div>
	);
}
