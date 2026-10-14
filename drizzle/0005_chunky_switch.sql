ALTER TABLE "users" ADD COLUMN "failed_sign_ins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "locked_until" timestamp with time zone;