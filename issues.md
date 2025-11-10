## Recurrent Issues & Observations

- **Onboarding flow reliability**
  - Quiz sometimes failed to save responses to `user_quiz_responses`, leading to incomplete personalization.
  - Redirects back to dashboard triggered before `is_newbie` flipped, trapping users in a loading loop.

- **Personalization consistency (“Alex Chen syndrome”)**
  - Generated missions used default craving copy when AI calls fell back to mock mode.
  - Primary craving and preferences were not propagated to level intro cards, rewards, or warm intros after onboarding.

- **Performance bottlenecks**
  - Dashboard and tab navigation blocked by aggressive 2-second `AbortController` timeouts.
  - Repeated fetches (profile, level data, pause tokens) fired concurrently, saturating the backend and spamming logs.
  - Tab switches incurred ~500 ms delays from duplicated data requests and missing memoization.

- **AI integration failures**
  - OpenAI requests rejected with `max_tokens` parameter error until we adopted `max_completion_tokens`.
  - Model selection drifted from spec (`gpt-5-mini` vs `gpt-5-nano`), inflating costs and causing inconsistent outputs.
  - Missing fallback messaging when AI responses timed out left UI in a “thinking…” state indefinitely.

- **Telemetry gaps**
  - Lack of `journey_events` logging made it hard to trace onboarding → dashboard transitions.
  - Button analytics missing throttling, causing telemetry flood and noisy terminal output.

- **Mock vs live mode ambiguity**
  - Environment heuristics misdetected real credentials as mock mode, hiding production-only bugs.
  - No explicit override to force live mode during QA runs.

- **Testing and tooling pain points**
  - `npm run test` failed due to `.ts` handling until `tsx` runner was added.
  - ESLint surfaced unused hooks/variables; missing dependencies in `useEffect` led to stale data.
  - Need for end-to-end verification of onboarding, personalization, rewards, and tab navigation across fresh accounts.

- **Frontend asset issues**
  - Missing favicon generated persistent 404s.
  - Stale `.next` cache produced `Invalid or unexpected token` errors in compiled bundles after dependency changes.

- **Deployment readiness blockers**
  - Incomplete migration coverage for new tables (e.g., `button_interactions`, `journey_events`) caused runtime SQL errors on fresh databases.
  - Manual QA uncovered buttons wired to mock handlers while backend endpoints expected live data.

