# CraveVerse Prompt Playbook  

## 1. Product Charter  
- **Vision**: Deliver a fast, empathetic coaching companion that helps users break cravings through structured missions, supportive community loops, and measurable wins.  
- **Audience**: Self-improvers tackling addictions (sugar, nofap, social-media, etc.) who expect guided nudges, fail-safe streak recovery, and privacy-respecting analytics.  
- **Tone & Experience**: Encouraging but direct. Surface next actions in <2 clicks, keep copy action-oriented, and avoid shaming language.  
- **Success Signals**: 7-day retention > 45%, average mission completion time < 3 minutes, and <1% API-error rate during peak (UTC 4–10pm).  
- **Journey Spine**: Landing → Quiz → Personalized Dashboard → Daily Missions & Reflections → Coins & Rewards → Battles/Community → Referrals.  

## 2. Feature Catalog Prompts  
For every feature, ensure the backend contract exists before the UI story enters implementation.  

### Landing & Acquisition  
- **Intent**: Convert curious visitors in <10 seconds.  
- **Outcomes**: CTA click-through ≥ 12%; latency < 1.5s p95.  
- **Dependencies**: `/app/page.tsx`, `trackJourneyEvent`, feature flags `isMockMode`.  
- **Acceptance**: Hero CTA sets `sessionStorage.landing_navigation`, logs `landing_navigation` telemetry, and routes to `/sign-up` with no layout shift.  

### Onboarding Quiz  
- **Intent**: Capture craving context, severity, and support level to seed personalization.  
- **Contracts**: `POST /api/onboarding/personalize`, `POST /api/onboarding/complete`. Requires Clerk session unless `isMockMode`.  
- **Outcomes**: personas stored under `users.preferences.onboarding`.  
- **Tests**: Unit coverage for blank craving, integration verifying `journey_events` insert on success/failure.  

### Dashboard & Progress  
- **Intent**: Present today's mission, streak, coins, and personalization snippet immediately after login.  
- **Contracts**: `GET /api/user/profile`, `GET /api/levels/{levelId}` with fallback to `GET /api/levels?craving=...`.  
- **Metrics**: mission load <500ms server time; 0 unhandled rejections in `DashboardPage`.  

### Level Flow  
- **Intent**: Provide 30-stage progression with reflections, rewards, and share hooks.  
- **Contracts**: `/api/levels/complete`, supabase tables `levels`, `user_progress`.  
- **Acceptance**: Completing level increments XP, coins, and raises telemetry event `level_completed`.  

### Rewards & Inventory  
- **Intent**: Translate effort into pause tokens, skips, and themes.  
- **Contracts**: `GET /api/rewards/inventory`, `POST /api/rewards/pause-token/activate`, `POST /api/rewards/level-skip/use`, `/api/rewards/theme/apply`.  
- **Metrics**: Inventory fetch <600ms, activation updates `streak_pauses` and decrements inventory reliably.  

### Battles  
- **Intent**: Competitive 24-hour challenges with auto matchmaking and task generation.  
- **Contracts**: `GET/POST /api/battles`, `QueueUtils.scheduleBattleTasks`, `battle_tasks` table.  
- **Acceptance**: Creation limited by tier; tasks generated via queue fallback if OpenAI unavailable.  

### Forum & Community  
- **Intent**: Provide moderated peer support with AI reply nudges.  
- **Contracts**: `/api/forum/threads`, `/api/forum/replies`, `OpenAIClient.generateForumReply`.  
- **Metrics**: AI fallback logs `mockUsed` flag; plus-tier unlocks unlimited posts.  

### Analytics & Telemetry  
- **Intent**: Surface actionable usage data without harming performance.  
- **Contracts**: `/api/analytics/interaction`, `journey_events`, `button_interactions`.  
- **Acceptance**: Logging endpoint must reject missing `pagePath/buttonId` with 400 and record to Supabase when real mode.  

### Billing & Pricing  
- **Intent**: Present Free/Plus/Ultra tiers with accurate copy and gating.  
- **Contracts**: `CONFIG.TIERS`, feature-gate helpers. Stripe endpoints stay disabled until real keys added.  
- **Acceptance**: Pricing page matches `CONFIG.PRICING_TIERS`; gating enforced via `canAccessFeature`.  

## 3. Backend Blueprint Prompts  

### 3.1 Authentication & Identity  
```
Intent: Clerk is source of truth; Supabase mirrors metadata.
Contract: POST /api/webhooks/clerk keeps Supabase in sync.
Success: Any API requiring auth returns 401 when Clerk user absent.
Observability: Log traceId via `createLogger` and propagate `x-trace-id`.
Failure Modes: Clerk outage ⇒ block writes, fall back to mock profile w/ warning.
Validation: Integration test hits `/api/user/profile` with/without session.
```

### 3.2 Onboarding  
```
Intent: Persist quiz answers + personalization once, idempotently.
Contracts: POST /api/onboarding/personalize (AI), POST /api/onboarding/complete (storage).
Data Shape: `user_quiz_responses` keyed by (user_id, quiz_version).
Resilience: On Supabase error, return mock fallback but write journey_event with failure metadata.
Tests: Simulate missing craving → expect 400; success writes preferences and sets `is_newbie=false`.
Telemetry: Always emit `dashboard_personalization_applied` once per session.
```

### 3.3 Levels & Progress  
```
Intent: Guarantee a level document is available even if Supabase misses.
Contracts: GET /api/levels/:id (primary), GET /api/levels?craving= (fallback).
Cache Strategy: No store, rely on Supabase; logging via `trackLatency`.
Failure Modes: Missing level ⇒ warn and return 404; client falls back to default message.
Tests: Level completion updates `user_progress`, rewards coins/xp, logs `level_completed`.
Migration Guard: `database/craveverse-complete-schema.sql` must include RLS for levels/user_progress.
```

### 3.4 Rewards & Inventory  
```
Intent: Treat consumables (pause tokens, level skips) as atomic operations.
Contracts: GET inventory; POST pause activate; POST level skip use; POST theme apply.
Rules: Reject unauthorized or mismatched tier usage; ensure quantity decrement transactional.
Failure Modes: Inventory mismatch ⇒ respond 404; activation stuck ⇒ return active pause details.
Tests: Mock mode returns deterministic payload; real mode verifies Supabase updates both streak_pauses and user_inventory.
```

### 3.5 Battles Engine  
```
Intent: Offer fair battles with minimal manual setup.
Contracts: GET/POST /api/battles, /api/battles/[id], /api/battles/tasks/complete.
Queue: Battle creation enqueues `battle_tasks` job via `QueueUtils.scheduleBattleTasks`.
Rate Limits: Free tier 1 battle per 24h; paid tiers 5; enforce via Supabase query.
Failure Modes: Queue failure ⇒ fallback to predefined tasks; log and return `mockUsed=true`.
Testing: Unit tests for creation rate limit; integration for task completion awarding XP/coins.
Observability: Use `logger` to capture `source` (queue or fallback) and battleId context.
```

### 3.6 Community & Forum  
```
Intent: Ensure respectful, tier-aware posting with AI assist.
Contracts: Threads/replies API; AI suggestion uses OpenAIClient.generateForumReply.
Moderation Hooks: Feature gate plus-tier for unlimited posts; free tier limited to 1/day.
Failure Modes: AI unavailable ⇒ fallback text from CONFIG; log `mockUsed`.
Tests: Validate unauthorized users receive 401, rate limit responses return 429.
```

### 3.7 Analytics & Telemetry  
```
Intent: Provide reliable behavioral metrics without blocking UX.
Contracts: POST /api/analytics/interaction inserts into button_interactions.
Data: Require pagePath + buttonId; optional metadata map.
Resilience: Mock mode logs only; real mode writes Supabase row.
Alerts: Monitor P95 latency <400ms and failure rate <0.5%.
Testing: API test ensures missing fields produce 400; valid payload logs info-level message.
```

### 3.8 Operations & Monitoring  
```
Intent: Surface actionable diagnostics for support.
Scripts: `scripts/diagnose.ps1`, `scripts/test-all.ps1`, `scripts/monitor.ps1`.
Health Endpoint: `/api/health` checks application + Supabase connectivity.
Observability: `lib/logger` attaches trace id; `lib/telemetry.trackLatency` captures duration and success.
Testing: CI must run `npm run type-check`, `npm run lint`, and integration suite.
```

## 4. Frontend Experience Prompts  

### Landing & Auth Funnel  
- **Narrative**: Hero speaks in second-person (“Conquer your cravings”). Avoid blocking auth redirect; if user is logged in, route within 1s.  
- **UX Cues**: Buttons use `sessionStorage` guard to prevent auto-redirect loops; highlight CTA with `bg-crave-orange`.  
- **Accessibility**: Ensure icons have `aria-hidden` and text alternatives; maintain 4.5:1 contrast.  
- **Validation**: Manually test desktop + mobile nav states; confirm `trackJourneyEvent` fires.  

### Onboarding Quiz  
- **Story**: Guide user through craving selection → severity → support → reflection. Keep each question on its own screen, show progress indicator.  
- **State**: `OnboardingQuiz` retains answers in context; on submit call `/api/onboarding/personalize` then display `PersonalizationResults`.  
- **Human Touch**: Copy acknowledges difficulty, present personalization hints in plain language.  
- **Checks**: Require reflection length > minimum; ensure `Continue` disabled during fetch.  

### Dashboard  
- **Narrative**: “Welcome back, {name}! Here’s today’s win.” Use personalization intro or fallback string.  
- **Layout**: Mission card first, quick actions right column, streak + coins in `DashboardStats`.  
- **Performance**: Fetch level data in effect with dedupe guard; never block initial render.  
- **Validation**: Force slow network—verify skeletons show, no layout shift when data arrives.  

### Level Detail & Completion  
- **Story**: Reinforce why the challenge matters; display XP/coin rewards immediately after completion.  
- **Inputs**: Reflection textarea with char counter; `Complete Level` disabled until threshold.  
- **Error Handling**: On API failure, show toast and keep data intact; track telemetry event.  
- **Share Flow**: `ShareModal` pre-populates win text; ensure copy-to-clipboard success message.  

### Rewards & Shop  
- **Narrative**: “Convert progress into boosters.” Inventory and shop separated but consistent styling.  
- **UX Rules**: Pause token card shows countdown when active; level skip button disabled when none.  
- **Validation**: Activation triggers optimistic UI then refresh inventory; check for tier-locked items showing upgrade CTA.  

### Battles  
- **Story**: Highlight opponent name, craving, countdown. Create modal must call out daily limit.  
- **Interaction**: Loading states for active/completed tabs; use toasts for success.  
- **Testing**: With free-tier user, attempt second battle creation → expect friendly limit warning.  

### Forum  
- **Tone**: Supportive, never dismissive. Provide AI suggestion chip but keep optional.  
- **Filters**: Preserve search/filter state between list and detail via query params or local state.  
- **Accessibility**: Reply editor labelled, ensure focus returns to thread list on close.  

### Settings  
- **Narrative**: Empower users to tune notifications, themes, profile.  
- **Validation**: Saving profile triggers refresh of context; theme change updates CSS variables instantly.  
- **Safety**: Danger zone disabled with helper text; ensure screen-reader explanation.  

## 5. Testing & Quality Gates  
- **Unit**: Cover API handlers for required fields, authentication rejection, and mock fallback.  
- **Integration**: Run `npm run test` (API + action log mitigation) and battle/rewards suites once re-enabled.  
- **Manual**: Follow `SMOKE_TESTS.md` after deployments; log outcomes in `TEST_RESULTS.md`.  
- **Performance**: Keep page load <2s p95 and API latency <500ms; monitor via PostHog + Supabase logs.  
- **Observability**: Every API response returns `x-trace-id`; error logs include trace + user context when available.  

## 6. Cross-Cutting Prompts  
- **Security**: Enforce RLS in Supabase, use Clerk session for all mutations, scrub `sk_` keys from commits.  
- **Compliance**: Provide delete/export hooks via Supabase functions; document in `docs/user-request-history.md`.  
- **Analytics**: Instrument `trackJourneyEvent` for major flows (landing, onboarding, dashboard, battle creation).  
- **Personalization**: When AI unavailable, use `CONFIG.FALLBACK_TEMPLATES` with `mockUsed` flag for telemetry.  
- **Community Standards**: Expose moderation tools (mute, report) once flagged in `docs/RECURRING_ISSUES.md`.  

## 7. Maintenance Workflow  
- **Prompt Lifecycle**: When adding a feature, draft backend directive first, map data contracts, then craft frontend narrative.  
- **Review**: Backend + frontend leads review new prompts; tests must exist before marking complete.  
- **Distribution**: Keep `PLAYBOOK.md` as source; auto-export key sections to team-specific docs if needed.  
- **Upkeep**: During sprint retro, review feature metrics vs success signals, update prompts accordingly.  
- **Incident Loop**: After outages, append learnings to `docs/RECURRING_ISSUES.md` and adjust prompts.  

---  
Use this playbook as the single reference when crafting new AI prompts, API stories, or UI briefs. Keep it lean: update sections only when behavior or metrics change.  

