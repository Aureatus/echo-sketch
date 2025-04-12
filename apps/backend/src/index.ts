import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono()
	.use(compress())
	.use(cors())
	.use(logger())
	.get("/", (c) => {
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
