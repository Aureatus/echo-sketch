import { hc } from "hono/client";
import type { AppType } from "../../../backend/src/index";

const client = hc<AppType>(import.meta.env.VITE_API_URL);

export { client };
