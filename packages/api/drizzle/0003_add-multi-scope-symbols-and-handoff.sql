-- Add multi-scope columns to symbols table
ALTER TABLE "symbols" ADD COLUMN IF NOT EXISTS "scope" varchar(20) NOT NULL DEFAULT 'team';--> statement-breakpoint
ALTER TABLE "symbols" ADD COLUMN IF NOT EXISTS "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "symbols" ADD COLUMN IF NOT EXISTS "prototype_id" uuid;--> statement-breakpoint
ALTER TABLE "symbols" ADD COLUMN IF NOT EXISTS "promoted_from" uuid;--> statement-breakpoint

-- Make team_id nullable (org-scoped symbols don't belong to a specific team)
ALTER TABLE "symbols" ALTER COLUMN "team_id" DROP NOT NULL;--> statement-breakpoint

-- Add foreign keys for new symbol columns
DO $$ BEGIN
 ALTER TABLE "symbols" ADD CONSTRAINT "symbols_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symbols" ADD CONSTRAINT "symbols_prototype_id_prototypes_id_fk" FOREIGN KEY ("prototype_id") REFERENCES "public"."prototypes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Add indexes for new symbol columns
CREATE INDEX IF NOT EXISTS "symbols_organization_idx" ON "symbols" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbols_prototype_idx" ON "symbols" USING btree ("prototype_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symbols_scope_idx" ON "symbols" USING btree ("scope");--> statement-breakpoint

-- Add state/user definitions to organizations
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "state_definitions" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "user_definitions" jsonb NOT NULL DEFAULT '[]'::jsonb;--> statement-breakpoint

-- Create github_team_connections table
CREATE TABLE IF NOT EXISTS "github_team_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL UNIQUE,
	"repo_owner" varchar(255) NOT NULL,
	"repo_name" varchar(255) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main' NOT NULL,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "github_team_connections" ADD CONSTRAINT "github_team_connections_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_team_connections" ADD CONSTRAINT "github_team_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_team_connections_team_idx" ON "github_team_connections" USING btree ("team_id");--> statement-breakpoint

-- Create github_handoff_connections table
CREATE TABLE IF NOT EXISTS "github_handoff_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL UNIQUE,
	"repo_owner" varchar(255) NOT NULL,
	"repo_name" varchar(255) NOT NULL,
	"default_branch" varchar(100) DEFAULT 'main' NOT NULL,
	"connected_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "github_handoff_connections" ADD CONSTRAINT "github_handoff_connections_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "github_handoff_connections" ADD CONSTRAINT "github_handoff_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_handoff_connections_team_idx" ON "github_handoff_connections" USING btree ("team_id");
