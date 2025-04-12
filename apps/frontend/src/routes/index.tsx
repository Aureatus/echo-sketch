import { createFileRoute } from "@tanstack/react-router";
import { client } from "../lib/rpc-client";

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		const res = await client.index.$get();
		const text = await res.text();
		return text;
	},
});

function App() {
	const data = Route.useLoaderData();

	return (
		<div className="text-center min-h-screen flex flex-col items-center justify-center  text-[calc(10px+2vmin)]">
			<p>Data from server: {data}</p>
		</div>
	);
}
