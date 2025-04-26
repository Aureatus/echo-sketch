import { migrate } from "drizzle-orm/node-postgres/migrator";
import db from "./index.js"; // Adjusted path: now relative to db directory

async function runMigrations() {
	console.log("[Migrator Script] Starting database migration...");

	try {
		// Use the shared db instance for migrations
		// Migrations folder path is relative to CWD where script is run (apps/backend), so keep it ./drizzle
		await migrate(db, { migrationsFolder: "./drizzle" });
		console.log("[Migrator Script] Migrations applied successfully.");
		// Exit successfully
		process.exit(0);
	} catch (error) {
		console.error("[Migrator Script] Migration failed:", error);
		// Exit with error code
		process.exit(1);
	}
}

runMigrations();
