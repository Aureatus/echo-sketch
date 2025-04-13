import { queryOptions } from "@tanstack/react-query";
import { client } from "./rpc-client";

export const indexQueryOptions = queryOptions({
	queryKey: ["index"],
	queryFn: async () => {
		const res = await client.index.$get();
		if (!res.ok) {
			throw new Error("Server error"); // Or handle more specific errors
		}
		return res.text();
	},
});
