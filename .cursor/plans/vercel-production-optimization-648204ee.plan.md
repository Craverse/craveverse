<!-- 648204ee-b8d4-41b2-b623-313954ee14de 2a88dad1-e8c0-4612-b6e1-9b4cbc805685 -->
# CraveVerse End-to-End Schema Finalization

## Step 1 – Cross-App Feature Inventory

- Audit each app domain (landing, onboarding, dashboard, levels, rewards, battles, forum, shop, settings, telemetry, admin) to confirm the data requirements already represented or still missing in `database/craveverse-complete-schema.sql`.
- Note any mismatches (fields absent, unused tables, data-types misaligned) to address in the schema assembly.

## Step 2 – Final Schema Assembly

- Update `database/craveverse-complete-schema.sql` so it codifies every required object (tables, enums, indexes, triggers, RLS policies, seed data) in the correct execution order with consistent comments.
- Ensure onboarding/quiz persistence, rewards inventory, telemetry, and monitoring tables are fully represented with accurate constraints and indexes.

## Step 3 – Security, Seeds, and Edge Review

- Reconfirm ROW LEVEL SECURITY, helper functions (e.g., streak utilities, mitigation triggers), and seed inserts align with today’s feature set.
- Determine whether any Supabase Edge Functions are required; if so, outline them in a new markdown brief, otherwise explicitly note that none are needed.

## Step 4 – Verification & Handoff

- Run schema lint/format checks (if available) and regenerate project docs referencing the final schema.
- Execute `npm run type-check`, `npm run lint`, `npm run test`, and a targeted manual QA checklist to ensure the application still aligns with the finalized schema before deployment.

### To-dos

- [ ] Create comprehensive testing scripts with auto-timeouts
- [ ] Create diagnosis script for automatic issue detection
- [ ] Create auto-fix script for common issues
- [ ] Create monitoring script for continuous performance tracking
- [ ] Run initial test suite and diagnose current issues
- [ ] Apply auto-fixes and verify improvements
- [ ] Restore level detail UX and wire streak utils
- [ ] Enhance map, fix mobile nav, enforce forum tier rules
- [ ] Finish theme application, inventory UI, pause persistence, reward metrics
- [ ] Implement unit/integration tests, Playwright e2e, PowerShell regression, monitoring hooks
- [ ] Full QA pass and documentation
- [ ] Resolve lint warnings across repo
- [ ] Draft comprehensive cross-tab test checklist
- [ ] Execute automated test suite (type-check, lint, unit/integration/e2e)
- [ ] Summarize findings and document follow-ups
- [ ] Update schema and env notes for quiz responses and button analytics
- [ ] Persist quiz completion and user flags
- [ ] Redirect post-signup to quiz and apply preferences
- [ ] Record per-page button presses
- [ ] Add integration test for mitigation alert flow
- [ ] Inventory app features and map data requirements
- [ ] Apply final edits to database/craveverse-complete-schema.sql
- [ ] Verify RLS, helper functions, seeds, and edge-function needs
- [ ] Run automated checks and capture final QA handoff summary
- [ ] Stabilize onboarding/dashboard data fetches to avoid abort and ensure personalization renders
- [ ] Inventory app features and map data requirements
- [ ] Apply final edits to database/craveverse-complete-schema.sql
- [ ] Verify RLS, helper functions, seeds, and edge-function needs
- [ ] Run automated checks and capture final QA handoff summary