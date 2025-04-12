import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono();

app.get("/", (c) => {
	return c.text("Hello Hono!");
}).post(
	'/testing',
	zValidator(
	  'form',
	  z.object({
		body: z.string(),
	  })
	),
	(c) => {
	  const validated = c.req.valid('form')
	  return c.json(validated)
	}
  )

serve(
	{
		fetch: app.fetch,
		port: 3001,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
