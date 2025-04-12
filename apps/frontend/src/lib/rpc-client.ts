import { hc } from "hono/client";
import type { AppType } from "../../../backend/src/index";

const client = hc<AppType>("http://localhost:3001/");

export { client };
