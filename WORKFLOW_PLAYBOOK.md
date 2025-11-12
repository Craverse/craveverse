# CraveVerse Workflow Playbook

## 1. User POV Journey Map
The table below links every primary user touchpoint to its supporting API contract and the template response we expect downstream teams to honor.

| Phase | UX Intent | API Endpoint(s) | Request Template | Response Template | Success Signals |
|-------|-----------|-----------------|------------------|-------------------|-----------------|
| Landing → Sign-up | Capture interest within 10s and hand off to Clerk | `trackJourneyEvent('landing_navigation')`, Clerk hosted `/sign-up` | ```json\n{\n  \"event\": \"landing_navigation\",\n  \"metadata\": { \"target\": \"/sign-up\" }\n}\n``` | ```json\n{\n  \"success\": true,\n  \"queued\": true,\n  \"traceId\": \"{{uuid}}\"\n}\n``` | CTA click-through ≥ 12%, p95 render < 1.5s |
| Clerk Sign-up → Quiz | Collect verified session and route to onboarding | Clerk session token, `GET /api/user/profile` | `Authorization: Bearer {{clerkToken}}` | ```json\n{\n  \"user\": {\n    \"id\": \"{{uuid}}\",\n    \"is_newbie\": true,\n    \"primary_craving\": null\n  },\n  \"mockUsed\": false\n}\n``` | Auth success rate ≥ 99.5%, profile fetch < 400 ms |
| Quiz Input → Personalization Preview | Generate actionable hints from quiz data | `POST /api/onboarding/personalize` | ```json\n{\n  \"craving\": \"{{cravingType}}\",\n  \"quizAnswers\": {{quizPayload}}\n}\n``` | ```json\n{\n  \"introMessage\": \"{{tone}}\",\n  \"customHints\": [\"{{hint1}}\", \"{{hint2}}\", \"{{hint3}}\"],\n  \"mockUsed\": false\n}\n``` | AI turnaround < 3 s, fallback rate < 5% |
| Personalization → Account Commit | Persist onboarding results and unlock dashboard | `POST /api/onboarding/complete` | ```json\n{\n  \"craving\": \"{{cravingType}}\",\n  \"quizAnswers\": {{quizPayload}},\n  \"personalization\": {{personalization}},\n  \"quizVersion\": \"v1\"\n}\n``` | ```json\n{\n  \"success\": true,\n  \"user\": {\n    \"id\": \"{{uuid}}\",\n    \"primary_craving\": \"{{cravingType}}\",\n    \"is_newbie\": false\n  },\n  \"mockUsed\": false\n}\n``` | Supabase write success ≥ 99%, telemetry records success/failure |
| Dashboard Load | Serve mission, streak, XP, coins instantly | `GET /api/user/profile`, `GET /api/levels/{id}` | N/A (GET) | ```json\n{\n  \"user\": {\n    \"current_level\": {{level}},\n    \"streak_count\": {{streak}},\n    \"cravecoins\": {{coins}}\n  }\n}\n``` and ```json\n{\n  \"level\": {\n    \"level_number\": {{level}},\n    \"challenge_text\": \"{{challenge}}\"\n  }\n}\n``` | Mission render < 600 ms combined; zero blocking loaders |
| Mission Complete | Log reflection, apply rewards, track sharing intent | `POST /api/levels/complete`, `trackJourneyEvent('level_completed')` | ```json\n{\n  \"levelId\": \"{{uuid}}\",\n  \"reflection\": \"{{text}}\"\n}\n``` | ```json\n{\n  \"success\": true,\n  \"rewards\": {\n    \"xp\": {{xp}},\n    \"coins\": {{coins}}\n  }\n}\n``` | Reward sync < 400 ms, telemetry fires with trace |
| Rewards Activation | Convert inventory into boosters | `POST /api/rewards/pause-token/activate`, etc. | ```json\n{\n  \"tokenId\": \"{{inventoryId}}\",\n  \"days\": 1\n}\n``` | ```json\n{\n  \"success\": true,\n  \"pausePeriod\": {\n    \"startDate\": \"{{date}}\",\n    \"endDate\": \"{{date}}\"\n  }\n}\n``` | Active pause reflected on dashboard within 5 s |
| Battles | Create challenge, fetch tasks, update progress | `POST /api/battles`, `QueueUtils.scheduleBattleTasks` | ```json\n{\n  \"craving_type\": \"{{craving}}\",\n  \"duration_hours\": 24\n}\n``` | ```json\n{\n  \"success\": true,\n  \"battle\": {\n    \"id\": \"{{uuid}}\",\n    \"status\": \"waiting\"\n  },\n  \"mockUsed\": false\n}\n``` | Battle creation success ≥ 98%, rate-limit errors surfaced clearly |
| Community Interaction | Post and receive AI suggestions respectfully | `POST /api/forum/threads`, `OpenAIClient.generateForumReply` | ```json\n{\n  \"title\": \"{{title}}\",\n  \"content\": \"{{body}}\"\n}\n``` | ```json\n{\n  \"thread\": {\n    \"id\": \"{{uuid}}\",\n    \"status\": \"published\"\n  }\n}\n``` and AI reply `string <= 20 words` | 0 moderation breaches, suggestion latency < 2 s |
| Analytics/Telemetry | Capture user behavior for dashboards | `POST /api/analytics/interaction` | ```json\n{\n  \"pagePath\": \"{{path}}\",\n  \"buttonId\": \"{{id}}\",\n  \"metadata\": {{meta}}\n}\n``` | ```json\n{\n  \"success\": true,\n  \"traceId\": \"{{uuid}}\"\n}\n``` | Log ingestion success ≥ 99%, error rate < 0.5% |

## 2. References
- Backend contracts and error handling: `PLAYBOOK.md`
- Metrics log: `WORKFLOW_METRICS.md`

## 2. Unified Testing Strategy
This phased harness supersedes `COMPREHENSIVE_TESTING_STRATEGY.md`, `ITERATIVE_TESTING_STRATEGY.md`, and `SMOKE_TESTS.md`. Treat each phase as a blocking gate; do not advance without green status.

| Phase | Scope & Goal | Tooling / Commands | Expected Artifacts |
|-------|--------------|--------------------|--------------------|
| **Phase A – Preflight Contracts** | Ensure type safety, lint health, and environment readiness. | `npm run type-check`<br>`npm run lint`<br>`scripts/test-all.ps1 -Preflight` | Updated `WORKFLOW_METRICS.md` entry with pass/fail, lint summary. |
| **Phase B – API Contract Validation** | Exercise core REST endpoints with deterministic fixtures (mock + real). | `npm run test` (API suites)<br>`scripts/test-layer5-api.ps1` | Test report snippet appended to `WORKFLOW_METRICS.md`; API trace IDs stored in run logs. |
| **Phase C – Integration Journeys** | Simulate end-to-end user flows (onboarding, rewards, battles). | `scripts/test-rewards-api.ps1`<br>`tests/integration/*.ts` via `npm run test` (filtered) | Annotated journey outcomes linked back to Section 1 map. |
| **Phase D – UX Smoke & Accessibility** | Manual verification against `SMOKE_TESTS` baseline plus accessibility audit. | `npm run dev` + manual walkthrough<br>`npx @axe-core/cli http://localhost:3000` | Consolidated checklist recorded under Metrics; accessibility findings filed in `docs/RECURRING_ISSUES.md` if any. |
| **Phase E – Performance & Observability** | Validate latency, error rates, telemetry completeness. | `scripts/monitor.ps1`<br>`npm run health-check`<br>PostHog + Supabase dashboards | Performance snapshot embedded in Metrics doc with links to dashboards. |

### Test Execution Templates
- **Result Log**  
```markdown
- Phase: {{A–E}}
- Date: {{YYYY-MM-DD}}
- Status: ✅/⚠️/❌
- Key Findings: …
- Trace References: …
- Follow-ups: …
```

- **API Contract Checklist**  
```text
[ ] Auth required endpoints return 401 without session
[ ] Mock mode flagged via `mockUsed`
[ ] Telemetry emits `x-trace-id`
[ ] Error paths produce actionable messages
```

## 3. Phase Execution Tracker
Use this checklist to drive live runs. Before each phase, confirm **Runtime Readiness**:
- Dev server available (`npm run dev:both`), port 3000 free (`netstat -ano | findstr :3000`), and no zombie Node processes.
- `.env`/`.env.local` populated with Clerk, Supabase, OpenAI keys; Supabase reachable (`scripts/diagnose.ps1`).
- `.next` directory cleared after crashes (OneDrive can lock `.next\trace`; stop processes then delete).
- Prefer using `scripts/dev-clean-start.ps1` to automate the cleanup + launch flow.
For each line item, append a Metrics entry referencing the phase letter and date.

### Phase A – Preflight Contracts
- [ ] Run `npm run type-check` (record duration + status in Metrics).
- [ ] Run `npm run lint`; capture top warning categories.
- [ ] Start dev server (`npm run dev:both`) or verify running instance.
- [ ] Execute `scripts/test-all.ps1 -Quick` or `-Preflight` once health/API checks pass; the cleanup script sets `DEV_PORT` automatically—override if you launch manually; log failures and remediation owner.

### Phase B – API Contract Validation
- [ ] Run `npm run test` (API suites); store trace IDs of failing tests.
- [ ] Execute `scripts/test-layer5-api.ps1`; document environment variables used.
- [ ] Snapshot `journey_events` count post-run (ensure telemetry writing).

### Phase C – Integration Journeys
- [ ] Execute `scripts/test-rewards-api.ps1`; verify rewards inventory delta.
- [ ] Run targeted integration tests: `tsx --test tests/integration/*.ts`.
- [ ] Document user persona used (free/plus/ultra) and note discrepancies.

### Phase D – UX Smoke & Accessibility
- [ ] Start dev server; walkthrough using `SMOKE_TESTS.md` scenarios.
- [ ] Run `npx @axe-core/cli http://localhost:3000` and attach summary.
- [ ] Log console/network anomalies with screenshots or HAR links.

### Phase E – Performance & Observability
- [ ] Execute `scripts/monitor.ps1` and capture latency percentiles.
- [ ] Hit `npm run health-check`; include response snippet in Metrics.
- [ ] Record PostHog & Supabase dashboard URLs for the run.

Each completed subtask must reference the corresponding Metrics entry (`WORKFLOW_METRICS.md`) for traceability. When readiness prerequisites fail (e.g., server down), document the remediation path before re-running.

## 4. Metrics Cross-Reference Index
- **Phase 1 Mapping** → `WORKFLOW_METRICS.md` entry “Phase 1: User POV Mapping”
- **Phase 2 Testing Strategy** → `WORKFLOW_METRICS.md` entry “Phase 2: Test Framework Consolidation”
- **Phase 3 Execution Tracker** → `WORKFLOW_METRICS.md` entry “Phase 3: Execution Tracker Setup”
- **Dev Clean Start Script** → `scripts/dev-clean-start.ps1` (referenced in Phase A readiness)

