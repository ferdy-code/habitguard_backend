CREATE UNIQUE INDEX "screen_time_limits_user_app_category_unique"
  ON "screen_time_limits" ("user_id", COALESCE("app_package_name", ''), COALESCE("category", ''));
--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_user_group_period_unique"
  ON "leaderboard_entries" ("user_id", COALESCE("group_id", '00000000-0000-0000-0000-000000000000'::uuid), "period_type", "period_start");
