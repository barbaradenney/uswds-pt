CREATE TABLE IF NOT EXISTS "github_org_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"repo_owner" varchar(255) NOT NULL,
	"repo_name" varchar(255) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main' NOT NULL,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "github_org_connections_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"symbol_data" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prototype_versions" ADD COLUMN IF NOT EXISTS "label" varchar(255);--> statement-breakpoint
ALTER TABLE "prototype_versions" ADD COLUMN IF NOT EXISTS "content_checksum" varchar(64);--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "team_id" uuid;--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "content_checksum" varchar(64);--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "branch_slug" varchar(200);--> statement-breakpoint
UPDATE "prototypes" SET "branch_slug" = "slug" WHERE "branch_slug" IS NULL;--> statement-breakpoint
ALTER TABLE "prototypes" ALTER COLUMN "branch_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "last_github_push_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "prototypes" ADD COLUMN IF NOT EXISTS "last_github_commit_sha" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_username" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "github_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" varchar(500);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_org_connections" ADD CONSTRAINT "github_org_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_org_connections" ADD CONSTRAINT "github_org_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbols" ADD CONSTRAINT "symbols_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbols" ADD CONSTRAINT "symbols_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_org_connections_org_idx" ON "github_org_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbols_team_idx" ON "symbols" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbols_created_by_idx" ON "symbols" USING btree ("created_by");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prototypes_team_idx" ON "prototypes" USING btree ("team_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prototypes" ADD CONSTRAINT "prototypes_team_branch_slug_unique" UNIQUE("team_id","branch_slug");
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN duplicate_table THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_github_id_unique" UNIQUE("github_id");
EXCEPTION
 WHEN duplicate_object THEN null;
 WHEN duplicate_table THEN null;
END $$;
