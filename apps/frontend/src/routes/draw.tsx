import { Excalidraw } from "@excalidraw/excalidraw";
import { createFileRoute } from "@tanstack/react-router";
import "@excalidraw/excalidraw/index.css";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/draw")({
	component: DrawRouteComponent,
});

function DrawRouteComponent() {
	const { resolvedTheme } = useTheme();

	return (
		<div style={{ height: "90vh" }}>
			<Excalidraw theme={resolvedTheme} />
		</div>
	);
}
