# CraveVerse Data Inventory\n\nThis document maps core application features to their database dependencies to ensure the final Supabase schema covers the entire product surface.\n\n## Landing & Marketing\n- Feature flags and experiments: handled client-side; no persistent storage required.\n- Button analytics: `button_interactions` captures per-page/button click counts.\n\n## Authentication & Profiles\n- User identity: `users` (Clerk linkage, craving context, subscription tier).\n- Admin access: `admin_users`.\n- Settings: `user_settings`, `notification_preferences`.\n\n## Onboarding Flow\n- Quiz responses and personalization: `user_quiz_responses`, `users.preferences`, `users.is_newbie`, `users.onboarding_completed_at`.\n- Telemetry for onboarding steps: `journey_events`.\n\n## Dashboard & Progression\n- Level definitions: `levels` (per craving), `level_map_data` (visual map coordinates).
- User progress & reflections: `user_progress`.
- Streak tracking: `users.streak_count`, `streak_pauses`.
- Telemetry & latency: `journey_events`.
- Activity summaries: `activity_log` (feed for recent actions across modules).
\n\n## Levels API & Daily Challenges\n- Completion records: `user_progress`.\n- Level skip inventory: `user_inventory` (utility items) with links to `shop_items`.\n- Mitigation events for failures: stored in queue/monitoring tables (see Monitoring section).\n\n## Rewards & Shop\n- Catalog: `shop_items`.\n- Purchases: `user_purchases`.\n- Inventory (pause tokens, skips): `user_inventory`, `streak_pauses` for active pauses.\n- Themes: `user_themes`; applied theme stored on `user_settings`.\n\n## Battles\n- Battle instances: `battles`.\n- Shared tasks: `battle_tasks` (AI-generated task cache).\n- Progress telemetry: `journey_events` (planned events).\n\n## Forum & Community\n- Threads: `forum_posts`.\n- Replies: `forum_replies`.\n- Moderation: `admin_users`, `forum_posts.status`.\n\n## Map & Exploration\n- Map presentation: `level_map_data`.\n- Progress overlay: `user_progress`.\n\n## Shareable Progress & Social\n- Shared snapshots: `shareable_progress`.
- Recent actions/activity: `activity_log`.
\n\n## Monitoring & Telemetry\n- Queue/backfill jobs: `queue_jobs`.
- AI usage for cost tracking: `ai_usage_metrics` (`ai_usage_log` view for admin analytics).
- Journey/latency events: `journey_events`.
- Button analytics: `button_interactions`.
\n\n## Payments & Subscriptions\n- Transactions: `payment_transactions` (Stripe webhooks) and the `transactions` view for analytics.
- Subscriptions & trials: `subscriptions`, `trial_history`, `users.plan_id`, `users.trial_ends_at`.
- Subscription tier stored on `users.subscription_tier`.
\n\n## Debug & Tooling\n- Debug API references `activity_log` and `test_table_creation` (tables absent and currently unused; decide whether to add or remove).\n\n## Gaps Identified\n1. **`test_table_creation` table** used only by debug route; optional—either add lightweight definition or remove/guard debug code.
2. **Configuration consistency**: ensure enums (e.g., craving types, subscription tiers) align with current UI options.
3. **Legacy `pause_tokens` table** is no longer used after inventory system adoption; consider removing from schema or documenting as deprecated.
*** End Patch

