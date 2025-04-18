import {
	Excalidraw,
	convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { InstructionModal } from "@/components/custom/InstructionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/useTheme";
import type { DiagramResponse } from "@/lib/queries";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	const { resolvedTheme } = useTheme();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const [mermaidCode, setMermaidCode] = useState<string>("");
	// History items with unique timestamp key
	type HistoryItem = DiagramResponse & { timestamp: number };
	const [history, setHistory] = useState<HistoryItem[]>([]);

	const handleDiagramGenerated = async (response: DiagramResponse) => {
		const { diagram } = response;
		console.log(
			"Received Mermaid code:",
			diagram,
			"Instruction:",
			response.instruction,
		);

		const api = excalidrawAPIRef.current;
		if (!api) {
			console.error("Excalidraw API not available yet.");
			return;
		}

		try {
			const { elements: rawElements } = await parseMermaidToExcalidraw(diagram);
			const excalidrawElements = convertToExcalidrawElements(rawElements);
			api.resetScene();
			api.updateScene({ elements: excalidrawElements });
			api.scrollToContent(excalidrawElements, { fitToContent: true });
			setMermaidCode(diagram);
			setIsModalOpen(false);
			setHistory((prev) => [...prev, { ...response, timestamp: Date.now() }]);
		} catch (error) {
			console.error(
				"Failed to parse Mermaid code received from backend:",
				error,
			);
			console.error("--- Failing Mermaid Code ---");
			console.error(diagram);
			console.error("--- End Failing Mermaid Code ---");
			toast.error("Diagram Generation Error", {
				description:
					"Failed to parse the generated diagram. The AI might have produced invalid code. Please try again.",
			});
		}
	};

	return (
		<div className="flex h-screen">
			<aside className="w-64 flex-shrink-0 p-4 bg-card text-card-foreground border-r border-border">
				<Card className="h-full">
					<CardHeader>
						<CardTitle>History</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<ScrollArea className="h-[calc(100vh-2rem)] p-2">
							<ul className="space-y-2">
								{history.map((item) => (
									<li key={item.timestamp}>
										<button
											type="button"
											className="text-primary hover:underline"
											onClick={async () => {
												const api = excalidrawAPIRef.current;
												if (!api) return;
												const { elements: rawElements } =
													await parseMermaidToExcalidraw(item.diagram);
												const excEl = convertToExcalidrawElements(rawElements);
												api.resetScene();
												api.updateScene({ elements: excEl });
												api.scrollToContent(excEl, { fitToContent: true });
												setMermaidCode(item.diagram);
											}}
										>
											{item.instruction}
										</button>
									</li>
								))}
							</ul>
						</ScrollArea>
					</CardContent>
				</Card>
			</aside>
			<main className="flex-1 overflow-hidden">
				<Excalidraw
					excalidrawAPI={(api) => {
						excalidrawAPIRef.current = api;
					}}
					theme={resolvedTheme}
					renderTopRightUI={() => {
						const buttonText = mermaidCode
							? "Update Diagram"
							: "Generate Diagram";
						return (
							<Button onClick={() => setIsModalOpen(true)} className="mr-2">
								{buttonText}
							</Button>
						);
					}}
				/>
				<InstructionModal
					open={isModalOpen}
					onOpenChange={setIsModalOpen}
					onDiagramGenerated={handleDiagramGenerated}
					existingDiagramCode={mermaidCode}
				/>
			</main>
		</div>
	);
}
