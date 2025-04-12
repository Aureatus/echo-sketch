import { createFileRoute } from "@tanstack/react-router";
import { client } from "../lib/rpc-client";
import logo from "../logo.svg";

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
		<div className="text-center">
			<header className="min-h-screen flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)]">
				<img
					src={logo}
					className="h-[40vmin] pointer-events-none animate-[spin_20s_linear_infinite]"
					alt="logo"
				/>
				<p>Data from server: {data}</p>
			</header>
		</div>
	);
}
