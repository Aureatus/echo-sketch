import { Excalidraw } from "@excalidraw/excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	return (
		<div style={{ height: "90vh" }}>
			<Excalidraw />
		</div>
	);
}
