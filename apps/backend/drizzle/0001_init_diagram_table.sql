CREATE TYPE "public"."diagram_type_enum" AS ENUM('mermaid', 'excalidraw');--> statement-breakpoint
CREATE TABLE "diagrams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"mermaid_code" text NOT NULL,
	"diagram_type" "diagram_type_enum" NOT NULL,
	"instruction" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "diagrams_user_id_type_idx" ON "diagrams" USING btree ("user_id","diagram_type");