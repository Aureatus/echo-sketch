import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./index.js"; // Adjusted path: now relative to db directory

export async function handler() {
	console.log("[Migrator Handler] Starting database migration...");
	await migrate(db, { migrationsFolder: "./drizzle" });
	console.log("[Migrator Handler] Migrations applied successfully.");
}

// Run the handler if the script is executed directly
if (
	import.meta.url.startsWith("file:") &&
	process.argv[1] === new URL(import.meta.url).pathname
) {
	console.log("[Migrator Script] Running migrations directly...");
	handler().catch((err) => {
		console.error("[Migrator Script] Migration failed:", err);
		process.exit(1);
	});
}
