import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	return (
		<div className="text-center h-full flex flex-col items-center justify-center p-4 gap-4">
			<h1 className="text-2xl font-bold mb-4">AI Diagram Generation</h1>
			<p className="max-w-md">
				This application provides interfaces for generating diagrams using AI
				from text or voice input. Choose one of the diagramming tools below to
				get started.
			</p>
			<div className="flex gap-4">
				<Link
					to="/draw"
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Generate Excalidraw Diagram
				</Link>
				<Link
					to="/mermaid"
					className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
				>
					Generate Mermaid Diagram
				</Link>
			</div>
		</div>
	);
}
