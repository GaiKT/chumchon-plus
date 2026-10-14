CREATE TYPE "public"."person_status" AS ENUM('resident', 'moved_out', 'deceased');--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"village_id" uuid NOT NULL,
	"house_no" text NOT NULL,
	"zone" text,
	"head_person_id" uuid,
	"note" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_village_id_id_key" UNIQUE("village_id","id")
);
--> statement-breakpoint
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"village_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"nickname" text,
	"relation_to_head" text,
	"birth_date" date,
	"phone" text,
	"note" text,
	"status" "person_status" DEFAULT 'resident' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persons_village_id_id_key" UNIQUE("village_id","id")
);
--> statement-breakpoint
ALTER TABLE "persons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "villages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"moo_no" text NOT NULL,
	"subdistrict" text NOT NULL,
	"district" text NOT NULL,
	"province" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "villages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_head_person_fk" FOREIGN KEY ("village_id","head_person_id") REFERENCES "public"."persons"("village_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_village_id_villages_id_fk" FOREIGN KEY ("village_id") REFERENCES "public"."villages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_household_fk" FOREIGN KEY ("village_id","household_id") REFERENCES "public"."households"("village_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "households_village_house_no_key" ON "households" USING btree ("village_id","house_no") WHERE "households"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "persons_household_id_idx" ON "persons" USING btree ("household_id");--> statement-breakpoint
CREATE POLICY "households_tenant_isolation" ON "households" AS PERMISSIVE FOR ALL TO public USING ("village_id" = nullif(current_setting('app.village_id', true), '')::uuid) WITH CHECK ("village_id" = nullif(current_setting('app.village_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "persons_tenant_isolation" ON "persons" AS PERMISSIVE FOR ALL TO public USING ("village_id" = nullif(current_setting('app.village_id', true), '')::uuid) WITH CHECK ("village_id" = nullif(current_setting('app.village_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "villages_tenant_isolation" ON "villages" AS PERMISSIVE FOR ALL TO public USING ("id" = nullif(current_setting('app.village_id', true), '')::uuid) WITH CHECK ("id" = nullif(current_setting('app.village_id', true), '')::uuid);