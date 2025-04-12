import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono().use(cors()).get("/", (c) => {
	return c.text("Hello Hono!");
});

serve(
	{
		fetch: app.fetch,
		port: 3001,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);

export type AppType = typeof app;
