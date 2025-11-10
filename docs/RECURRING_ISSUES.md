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

### Deployment-Blocking Gaps
- **Symptoms:** Fresh environments crash due to missing tables; buttons wired to mock handlers in production.
- **Impact:** Release readiness delayed.
- **Root Cause:** Incomplete migrations (`button_interactions`, `journey_events`); inconsistent wiring between frontend and backend endpoints.

---

**Last updated:** 2025-11-10  
Keep this file synchronized with future regressions so we retain long-term visibility into persistent pain points.

