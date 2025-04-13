import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { indexQueryOptions } from "../lib/queries";

export const Route = createFileRoute("/")({
	component: App,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(indexQueryOptions);
	},
});

function App() {
	const { data } = useSuspenseQuery(indexQueryOptions);

	return (
		<div className="text-center h-full flex flex-col items-center justify-center  text-[calc(10px+2vmin)]">
			<p>Data from server: {data}</p>
		</div>
	);
}
