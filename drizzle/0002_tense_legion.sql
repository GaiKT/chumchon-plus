CREATE INDEX "households_house_no_pattern_idx" ON "households" USING btree ("house_no" text_pattern_ops);--> statement-breakpoint
CREATE INDEX "persons_first_name_trgm_idx" ON "persons" USING gin ("first_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_last_name_trgm_idx" ON "persons" USING gin ("last_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_nickname_trgm_idx" ON "persons" USING gin ("nickname" gin_trgm_ops);