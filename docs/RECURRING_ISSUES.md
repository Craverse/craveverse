## Recurrent Issues & Observations

- **Onboarding flow reliability**
  - Quiz responses intermittently failed to persist to `user_quiz_responses`, blocking progression.
  - `is_newbie` flag stayed `true` after quiz, causing redirect loops and endless loading.

- **Personalization consistency (“Alex Chen syndrome”)**
  - Missions and rewards defaulted to generic copy when AI was unavailable or mock data leaked into production.
  - Selected cravings and preferences were not propagated to dashboards, warm intros, or notifications.

- **Performance bottlenecks**
  - Dashboard and tab navigation aborted after 2 s due to aggressive `AbortController` usage.
  - Parallel API calls (profile, level data, pause tokens) triggered repeatedly, spamming terminal and backend.
  - Tab switches incurred ~500 ms delays from duplicate fetches and missing memoization.

- **AI integration failures**
  - OpenAI requests rejected with `Unsupported parameter: max_tokens`; required `max_completion_tokens`.
  - Model selection drifted from spec (`gpt-5-mini` vs `gpt-5-nano`), causing cost spikes and inconsistent tone.
  - Missing fallbacks left UI stuck on “Loading your dashboard” when AI responses timed out.

- **Telemetry gaps**
  - Lack of `journey_events` logging obscured onboarding → dashboard transitions.
  - Button analytics lacked throttling, creating telemetry floods and terminal noise.

- **Mock vs live mode ambiguity**
  - Heuristic detection misclassified environments, hiding live-only issues.
  - No explicit env override to force live mode during QA until recently.

- **Testing and tooling friction**
  - `npm run test` failed on `.ts` integration tests until `tsx --test` was configured.
  - ESLint flagged unused hooks/variables and missing deps in `useEffect`, indicating stale logic.
  - Need for consistent end-to-end runs covering onboarding, personalization, rewards, and tab navigation.

- **Frontend asset issues**
  - Missing favicon produced persistent 404s in local dev.
  - Stale `.next` cache served corrupted bundles with “Invalid or unexpected token” errors.

- **Deployment readiness blockers**
  - Fresh environments lacked migrations for new analytics tables, causing runtime SQL errors.
  - Several buttons pointed to mock handlers while prod APIs expected real data.
## Recurring Issues Log

This document consolidates the problems that have resurfaced throughout development, testing, and manual usage. Each entry highlights the typical symptoms, impact, and underlying cause when known.

---

### Onboarding Flow
- **Symptoms:** Quiz submissions sometimes fail to persist; users redirected before `is_newbie` flips; dashboard stuck on loading spinner.
- **Impact:** Personalization never activates, trapping new accounts in a limbo state.
- **Root Cause:** Race conditions between quiz completion, profile refresh, and Supabase writes; missing persistence of `user_quiz_responses`.

### Personalization Drift (“Alex Chen Syndrome”)
- **Symptoms:** Missions, intros, and rewards revert to generic copy despite completed onboarding.
- **Impact:** Breaks the promise of a customized experience.
- **Root Cause:** Craving data not injected into downstream render pipelines; AI fallbacks defaulting to canned messaging when mock mode triggers.

### Performance & Latency
- **Symptoms:** ~500 ms delays on tab switches; dashboard never resolves; terminal spam from repeated API calls.
- **Impact:** Perceived sluggishness, frustration, and elevated error risk.
- **Root Cause:** Aggressive 2 s AbortController timeouts on critical fetches; duplicate concurrent requests; lack of throttling for telemetry and pause-token queries.

### AI Integration Reliability
- **Symptoms:** OpenAI requests rejected (`max_tokens`); personalization prompts time out; inconsistent model usage.
- **Impact:** Missing or stale AI-driven content.
- **Root Cause:** Outdated parameter names; incorrect model routing vs. spec (`gpt-5-mini` vs `gpt-5-nano`); absent graceful fallbacks.

### Mock vs Live Environment Ambiguity
- **Symptoms:** Real testing inadvertently runs in mock mode; production-only bugs masked.
- **Impact:** QA gaps and false confidence in feature readiness.
- **Root Cause:** Heuristic mock detection without explicit environment overrides.

### Telemetry & Analytics Noise
- **Symptoms:** Flood of button interaction logs; limited visibility into user journeys.
- **Impact:** Hard to trace regressions; monitoring signal buried in noise.
- **Root Cause:** Missing throttling/debouncing; lack of `journey_events` logging for key milestones.

### Tooling & Testing Friction
- **Symptoms:** `npm run test` fails on `.ts`; ESLint repeatedly flags unused hooks; insufficient end-to-end coverage.
- **Impact:** Slows regression detection and erodes confidence.
- **Root Cause:** Node test runner not configured for TypeScript until `tsx`; hooks misplaced in JSX; absent scripted QA flows.

### Frontend Build Artifacts
- **Symptoms:** `Invalid or unexpected token` in `_next/static/.../app/layout.js`; persistent favicon 404.
- **Impact:** Users blocked at landing page; console noise.
- **Root Cause:** Stale `.next` cache after dependency updates; missing favicon asset.

### Next.js Trace Permission Conflict
- **Symptoms:** Dev server crashes with `EPERM: operation not permitted, open '.next\trace'`; cleanup of `.next` fails while process still holding lock.
- **Impact:** Local dev cannot start, quick preflight suites report server/API failures, dashboard chunk loading times out.
- **Root Cause:** OneDrive/Windows locking `.next\trace` while multiple Node processes attempt to write trace output; orphaned node processes continue listening on port 3000.
- **Mitigation:** Stop existing Node processes on port 3000 (`Stop-Process`), remove `.next` directory, disable trace generation if necessary, rerun dev server outside synced folders when possible.

### Supabase Seed Drift
- **Symptoms:** `/api/levels/level-1` returns error/timeout; dashboard level card stays empty and quick preflight flags server/API/database failures.
- **Impact:** Feature validation blocked; automated suites report false negatives.
- **Root Cause:** Supabase instance missing baseline seed data (levels) or user rows for the active Clerk account.
- **Mitigation:** Re-run `database/craveverse-complete-schema.sql` followed by `database/import-levels.sql`, then ensure the active Clerk user exists in `users`. Re-verify by calling `/api/levels/level-1`.

### Deployment-Blocking Gaps
- **Symptoms:** Fresh environments crash due to missing tables; buttons wired to mock handlers in production.
- **Impact:** Release readiness delayed.
- **Root Cause:** Incomplete migrations (`button_interactions`, `journey_events`); inconsistent wiring between frontend and backend endpoints.

---

**Last updated:** 2025-11-10  
Keep this file synchronized with future regressions so we retain long-term visibility into persistent pain points.

