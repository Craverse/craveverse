## Feature-to-Schema Inventory (2025-01-25)

This inventory maps every user-facing domain to the Supabase objects in `database/craveverse-complete-schema.sql`. It highlights the data flows, key constraints, and any open gaps to address before finalizing the schema.

### Landing & Marketing
- **Tables / Views:** `button_interactions`, `journey_events`
- **Purpose:** Capture CTA clicks, tab switches, and funnel performance without requiring authentication.
- **Coverage:** ✅ Existing tables include per-button throttling fields (`click_count`, `last_clicked_at`) and generic metadata for experimentation.
- **Gaps / Follow-up:** None; monitoring hooks already reference these tables.

### Authentication & Settings
- **Tables:** `users`, `notification_preferences`, `user_settings`, `activity_log`, `trial_history`
- **Purpose:** Persist Clerk identities, onboarding status, notification toggles, theme/settings, and trial history.
- **Coverage:** ✅ `users` includes `is_newbie`, `onboarding_completed_at`, `preferences` (JSONB) for quick personalization. Audit trails land in `activity_log`.
- **Gaps:** Consider auto-filling `notification_preferences` seed defaults during migrations (pending utility function).

### Onboarding Flow
- **Tables:** `user_quiz_responses`, `journey_events`, `ai_usage_metrics`, `queue_jobs`
- **Purpose:** Store quiz answers, personalization payloads, telemetry, AI token usage, and deferred jobs for batch personalization.
- **Coverage:** ✅ `user_quiz_responses` keyed by `user_id` + `quiz_version`; `journey_events` tracks `phase` + `metadata`.
- **Gaps:** None identified—the schema supports retries, quiz versioning, and telemetry granularity requested.

### Dashboard & Personalization
- **Tables / Views:** `users`, `user_dashboard` (view), `user_progress`, `level_map_data`, `shareable_progress`
- **Purpose:** Render current level, streak, XP/coin totals, and personalized map progress.
- **Coverage:** ✅ `user_dashboard` view aggregates streak, XP, inventory. `level_map_data` caches traversal metadata.
- **Gaps:** Documented requirement to surface warm-intro copy is satisfied via `users.ai_summary`; no additional columns needed.

### Levels & Missions
- **Tables:** `levels`, `user_progress`, `journey_events`, `queue_jobs`, `ai_usage_metrics`
- **Purpose:** Track authored level templates, completion history, AI feedback, and in-flight missions.
- **Coverage:** ✅ Composite uniqueness (`craving_type`, `level_number`) prevents duplicates. `user_progress.metadata` stores completion artifacts.
- **Gaps:** None; fallback mission data exists in `levels` seed block.

### Rewards, Inventory & Shop
- **Tables:** `shop_items`, `user_inventory`, `pause_tokens`, `streak_pauses`, `rewards_redemptions`, `payment_transactions`
- **Purpose:** Sell/persist cosmetic themes, pause tokens, and track redemptions or Stripe transactions (even if free tier).
- **Coverage:** ✅ Inventory/consumables split (`user_inventory` vs `pause_tokens`). Stripe audit table retained for future billing.
- **Gaps:** Ensure `shop_items` seeds include the latest theme SKUs before launch (minor content refresh task, not schema change).

### Battles & Social Play
- **Tables:** `battles`, `battle_tasks`, `battle_participants`, `battle_results`, `journey_events`
- **Purpose:** Manage matchmaking, cached AI tasks, results, and telemetry.
- **Coverage:** ✅ `battle_participants` covers multi-user expansions; `battle_tasks` caches prompts for reuse.
- **Gaps:** None noted—RLS restricts participants, and status enums align with frontend state machine.

### Forum & Community
- **Tables:** `forum_posts`, `forum_replies`, `forum_tags`, `forum_post_tags`, `forum_moderation_queue`
- **Purpose:** Power community threads, replies, tagging, and moderation.
- **Coverage:** ✅ Junction tables enable multi-tag filtering; moderation queue includes `reason` and `handled_by`.
- **Gaps:** Evaluate index on `forum_posts (craving_type, created_at DESC)` once traffic grows (performance tuning, optional).

### Telemetry & Monitoring
- **Tables / Functions:** `journey_events`, `button_interactions`, `ai_usage_metrics`, `queue_jobs`, helper functions (`log_ai_usage`, `get_user_progress_stats`)
- **Purpose:** Intelligence for latency dashboards, AI spend, queue health.
- **Coverage:** ✅ Tables include timestamp indexes; helper functions feed monitoring scripts.
- **Gaps:** None—existing triggers update timestamps automatically.

### Admin & Reporting
- **Tables / Views:** `admin_users`, `user_dashboard`, `level_details`, `battle_details`, `forum_post_details`
- **Purpose:** Role-scoped access to aggregated metrics and moderation data.
- **Coverage:** ✅ `admin_users` table gates admin dashboard; views consolidate cross-table metrics for reporting.
- **Gaps:** Ensure `admin_users` seeded with founder accounts during deployment (operational step).

---

### Summary
The current schema covers every feature domain with dedicated tables, supporting telemetry, personalization, and admin oversight. Only operational follow-ups remain (seed defaults for notification preferences, shop inventory refresh, optional forum index). No structural changes are required before finalizing the schema.

