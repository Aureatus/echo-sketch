import { hc } from "hono/client";
import type { AppType } from "../../../backend/src/index";
import { getOrCreateUserId } from "./utils";

const client = hc<AppType>(import.meta.env.VITE_API_URL, {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => {
		const userId = getOrCreateUserId();
		const headers = new Headers(init?.headers);
		headers.set("X-User-ID", userId);

		return fetch(input, {
			...init,
			headers,
		});
	},
});

export { client };
