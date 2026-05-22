import { sql } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: varchar({ length: 255 }).notNull(),
	age: integer().notNull(),
	email: varchar({ length: 255 }).notNull().unique(),
});

// Define the PostgreSQL enum type
export const diagramTypeEnum = pgEnum("diagram_type_enum", [
	"mermaid",
	"excalidraw",
]);

export const diagrams = pgTable(
	"diagrams",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id").notNull(),
		mermaidCode: text("mermaid_code").notNull(),
		diagramType: diagramTypeEnum("diagram_type").notNull(),
		instruction: text("instruction"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => sql`CURRENT_TIMESTAMP`)
			.notNull(),
	},
	(table) => {
		return [
			uniqueIndex("diagrams_user_id_type_idx").on(
				table.userId,
				table.diagramType,
			),
		];
	},
);
