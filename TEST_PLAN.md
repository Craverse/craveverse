# CraveVerse Cross-Tab Test Checklist

Use this guide when validating a build. Run through every tab to confirm core workflow, rewards, and personalization are functional end-to-end.

## 1. Landing Page
- [ ] Verify hero CTAs (`Start Journey`, `View Pricing`) navigate instantly.
- [ ] Confirm authenticated redirect logic does not trigger for visitors.
- [ ] Ensure background media/images load without flicker; check console for 404s.

## 2. Onboarding
- [ ] Select each craving path and complete quiz; reflection enforced before finish.
- [ ] Confirm personalization results appear (AI fallback messaging acceptable).
- [ ] After completion, ensure redirect to dashboard and profile update.

## 3. Dashboard
- [ ] Verify stats (level, streak, XP, coins) render immediately, no blocking loaders.
- [ ] Complete current level with reflection; confirm streak/coins update and share modal text prefilled.
- [ ] Activate pause token if available; ensure widget shows countdown on refresh.
- [ ] Quick Actions: test navigation for Forum, Battles, Leaderboard, Shop, Pricing.
- [ ] Recent Activity timeline lists latest entries without console errors.

## 4. Level Detail
- [ ] Reflection enforcement (minimum characters) before completion allowed.
- [ ] Completion summary shows AI feedback and rewards; share workflow copies text.
- [ ] Skip button obeys inventory (mock if necessary).

## 5. Map
- [ ] Journey snapshot cards populate (progress %, streak message, projected finish).
- [ ] Tooltip/hover states show level status messaging, no empty grid states.

## 6. Forum
- [ ] Free-tier account sees reply box disabled with upgrade prompt.
- [ ] Plus-tier account (or mock) posts thread and reply; AI suggestion button responds within timeout.
- [ ] Thread navigation (list → detail → back) preserves filters/search.

## 7. Battles
- [ ] Active and completed tabs fetch without hanging; timeouts handled gracefully.
- [ ] Create battle modal submits and triggers toast.
- [ ] Cards display icons and status colors accurately.

## 8. Shop & Rewards
- [ ] Item catalog filters by type; tier-locked items show upgrade CTA.
- [ ] Purchase flow deducts coins, updates inventory display, and logs in purchase history.
- [ ] Inventory panel reflects quantities/expiration; active pause fetch endpoint reachable.

## 9. Progress
- [ ] Personal stats cards, chart, achievements, and activity list render with fallback data.
- [ ] Share modal generates link and copies to clipboard.

## 10. Settings
- [ ] Profile form loads from `/api/settings/profile`, updates name/avatar, and refreshes context.
- [ ] Notification preferences load/save and show status messaging.
- [ ] Theme selector lists unlocked themes; applying theme updates UI (CSS variables) and persists on reload.
- [ ] Danger zone button remains disabled with helper text.

## 11. Global Checks
- [ ] Navigation: Desktop sidebar & mobile bottom nav retain correct active state.
- [ ] Theme application: switching themes updates colors across layout.
- [ ] Error boundaries: force client error (e.g., manual `throw` test) to verify graceful fallback.
- [ ] Inspect console/network for slow requests or 4xx/5xx responses.

## 12. Automated Suite
- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run test` (unit/integration once fleshed out)
- [ ] `npx playwright test` (proxy/extension scenario once implemented)
- [ ] PowerShell regression scripts under `scripts/` (rewards flow)

Document findings in the test report (see TODO `test-report`) and raise tickets for any regressions before release.*** End Patch

