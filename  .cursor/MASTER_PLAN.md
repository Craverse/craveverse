# 🎯 CRAVEVERSE MVP - MASTER IMPLEMENTATION PLAN

**Last Updated:** 2025-01-25  
**Current Stage:** Stage 1A - Infrastructure Fix  
**Status:** Planning Complete, Ready to Execute

---

## 📊 OVERALL STRATEGY

### Three-Stage Approach:
1. **Stage 1:** Complete App with Full UI/UX (Mock Data) - ZERO ERRORS
2. **Stage 2:** API Integration (OpenAI GPT-5, Supabase, Stripe, Redis)
3. **Stage 3:** Polish & Production Deployment

---

## 🚀 STAGE 1: CORE APP RESTORATION + FULL UI/UX (CURRENT)

**Goal:** Get entire app working with beautiful UI, full navigation, mock data. User can experience complete flow with zero errors.

### PHASE 1A: FIX INFRASTRUCTURE (IMMEDIATE PRIORITY) ⚡

**Problem:** Infinite API calls, Clerk errors, missing components, bare-bones pages

**Critical Fixes:**
1. ✅ **Fix UserContext** (`contexts/user-context.tsx`)
   - Detect mock mode (no env vars)
   - Return mock user profile immediately
   - NO API calls in mock mode
   - Stop infinite `/api/user/profile` loop

2. ✅ **Fix Middleware** (`middleware.ts`)
   - Completely bypass Clerk in mock mode
   - Allow all routes when no Clerk keys
   - No authentication errors

3. ✅ **Fix API Routes** (All `/app/api/**/route.ts`)
   - `/api/user/profile` - Return mock profile in mock mode
   - `/api/onboarding/complete` - Accept mock user
   - `/api/onboarding/personalize` - Return mock AI response
   - All other APIs - Mock mode detection

4. ✅ **Fix App Layout** (`app/layout.tsx`)
   - Conditional ClerkProvider (only if keys exist)
   - Always wrap with UserProvider
   - No crashes in mock mode

**Success Criteria:**
- ✅ Zero console errors
- ✅ Zero API errors in logs
- ✅ No infinite loops
- ✅ All pages load without crashes
- ✅ TypeScript compiles with no errors

---

### PHASE 1B: RESTORE DASHBOARD & ONBOARDING

**1. Dashboard Restoration** (`app/dashboard/page.tsx`)
- Restore full rich dashboard (currently bare-bones)
- Add back all components:
  - `DashboardStats` - XP, coins, streak, level stats
  - `LevelCard` - Today's challenge card
  - `QuickActions` - Quick navigation buttons
  - `RecentActivity` - Activity feed
  - `DebugPanel` - Development monitoring (collapsible)
- Use mock data for all stats
- Beautiful, polished UI

**2. Onboarding Restoration** (`app/onboarding/page.tsx`)
- Restore complete quiz flow (currently simplified)
- All quiz questions for each craving type
- Personalization step with AI preview (show "API" placeholder)
- Smooth step transitions
- Progress indicator
- Beautiful, engaging UI

**3. Component Restoration**
- `components/levels/level-card.tsx` - Rich level display
- `components/dashboard-stats.tsx` - Stats grid
- `components/quick-actions.tsx` - Action buttons
- `components/recent-activity.tsx` - Activity timeline
- `components/debug-panel.tsx` - Dev tools (collapsible)

**Success Criteria:**
- ✅ Dashboard shows full UI with mock data
- ✅ Onboarding has complete quiz flow
- ✅ All components render beautifully
- ✅ Smooth transitions between steps
- ✅ Zero errors

---

### PHASE 1C: BUILD REMAINING 7 CORE PAGES

**Page Structure:**
```
1. ✅ Landing Page (app/page.tsx) - DONE
2. ✅ Onboarding (app/onboarding/page.tsx) - DONE
3. ✅ Dashboard (app/dashboard/page.tsx) - DONE
4. ✅ Level Detail (app/levels/[levelId]/page.tsx)
5. ✅ Crave Map (app/map/page.tsx)
6. ✅ Forum (app/forum/page.tsx)
7. ✅ Battles (app/battles/page.tsx)
8. ✅ Rewards Shop (app/shop/page.tsx)
9. ⏳ Progress/Share (app/progress/page.tsx)
10. ✅ Settings (app/settings/page.tsx)
```

**4. Level Detail Page** (`app/levels/[levelId]/page.tsx`)
- Level header with number, title, difficulty
- Challenge description (5-10 min actionable task)
- Reflection input (checkbox/text)
- AI feedback section (show "API" placeholder)
- Reward display (XP, coins, streak update)
- Share button
- Complete/Skip buttons
- Mock data for 30 levels

**5. Crave Map Page** (`app/map/page.tsx`)
- Visual 30-level map (grid or path layout)
- Completed levels (green checkmark)
- Current level (highlighted, pulsing)
- Locked levels (greyed out, lock icon)
- Hover tooltips with level info
- Progress bar (X/30 completed)
- Streak indicators
- Projected completion date
- Beautiful, game-like UI

**6. Forum/Community Page** (`app/forum/page.tsx`)
- Thread list with categories (by craving type)
- Thread preview cards (title, excerpt, author, replies, upvotes)
- "New Thread" button (Plus+ badge if free user)
- Filter by craving type, trending, recent
- Thread detail view with replies
- Reply input (disabled for free users with upgrade prompt)
- "Ask CraveBot" button (show "API" placeholder)
- Mock thread data (10-20 threads)
- Upvote/reaction buttons

**7. Battles/Challenges Page** (`app/battles/page.tsx`)
- "Find Battle" button (match users by level/craving)
- Active battles list
- Battle card showing:
  - Opponent name/avatar (mock)
  - Challenge tasks (show "API" for AI-generated)
  - Progress bars for both users
  - Time remaining (24hr countdown)
  - Current winner indicator
- Completed battles history
- Leaderboard section (top battlers)
- Battle rewards display (XP, coins, badges)
- Mock battle data

**8. Rewards/Shop Page** (`app/shop/page.tsx`)
- CraveCoin balance display (large, prominent)
- Shop categories:
  - Pause Tokens (1-day: 50 coins, 3-day: 120 coins)
  - Level Skips (100 coins each)
  - Cosmetic Themes (50-200 coins)
  - Premium Perks (Ultra/Plus badges)
- Item cards with:
  - Icon/image
  - Name and description
  - Price in coins
  - "Purchase" button
  - Premium badge if Plus+ required
- Purchase history section
- Stripe integration placeholder for coin purchases
- Mock inventory

**9. Progress/Share Page** (`app/progress/page.tsx`)
- Weekly summary card:
  - Levels completed this week
  - Total streak
  - Cravings resisted count
  - XP gained
- Total progress summary (all-time stats)
- Shareable card generator:
  - Auto-generated image with stats
  - Customizable message
  - Social platform buttons (Twitter, Instagram, etc.)
  - Copy link button
- Achievement archive (badges, milestones)
- Charts/graphs (streak over time, XP growth)
- Mock data for all stats

**10. Settings/Profile Page** (`app/settings/page.tsx`)
- Profile section:
  - Avatar upload
  - Name, email (read-only)
  - Craving type (change with confirmation)
  - Bio/about
- Subscription management:
  - Current plan display (Free/Plus/Ultra)
  - Upgrade buttons
  - Billing history
  - Cancel subscription
- Coin & purchase history
- Notifications & reminders:
  - Daily reminder toggle
  - Email notifications
  - Push notifications (if enabled)
- Account settings:
  - Privacy settings
  - Data export
  - Delete account
- Mock subscription data

**Success Criteria:**
- ✅ All 10 pages exist and render
- ✅ Beautiful, polished UI for each page
- ✅ Mock data makes pages feel alive
- ✅ All interactions work (buttons, forms, navigation)
- ✅ Zero errors on any page

---

### PHASE 1D: GLOBAL NAVIGATION & FLOW

**Navigation System:**
- Sidebar navigation (desktop) with icons + labels
- Bottom tab bar (mobile) with icons
- Navigation items:
  1. 🏠 Home (Dashboard)
  2. 🎯 Today's Level
  3. 🗺️ Map
  4. 💬 Forum
  5. ⚔️ Battles
  6. 🏆 Rewards
  7. 📊 Progress
  8. ⚙️ Settings

Status: ✅ Implemented `components/app-shell.tsx` and wrapped `app/layout.tsx`.

**Flow Testing:**
1. Landing → Onboarding → Dashboard
2. Dashboard → Level Detail → Complete → Dashboard
3. Dashboard → Map → Level Detail
4. Dashboard → Forum → Thread Detail
5. Dashboard → Battles → Battle Detail
6. Dashboard → Shop → Purchase Item
7. Dashboard → Progress → Share Card
8. Dashboard → Settings → Profile Edit

**Success Criteria:**
- ✅ Navigation works on all pages
- ✅ Smooth transitions
- ✅ Active state indicators
- ✅ Mobile responsive
- ✅ Complete user flow works end-to-end

---

## 📋 STAGE 1 CHECKLIST

### Infrastructure (Phase 1A)
- [x] Fix UserContext (no API calls in mock mode)
- [x] Fix Middleware (bypass Clerk in mock mode)
- [x] Fix API routes (mock mode detection)
- [x] Fix App Layout (conditional providers)
- [x] Verify zero errors (console, logs, TypeScript)

### Core Pages (Phase 1B)
- [x] Restore Dashboard with all components
- [x] Restore Onboarding with complete quiz
- [x] Verify both pages work perfectly

### New Pages (Phase 1C)
- [x] Create Level Detail page
- [x] Create Crave Map page
- [ ] Create Forum page
- [ ] Create Battles page
- [x] Create Rewards Shop page
- [ ] Create Progress/Share page
- [x] Create Settings page

### Navigation (Phase 1D)
- [x] Implement global navigation (sidebar + mobile)
- [x] Test all navigation flows
- [x] Verify mobile responsiveness

### Final Verification (Phase 1E)
- [ ] All 10 pages render perfectly
- [ ] Complete user flow works
- [ ] Zero errors (build, runtime, console)
- [ ] Mock data makes app feel alive
- [ ] AI placeholders in place

---

## 🔄 STAGE 2: API INTEGRATION (FUTURE)

**Not started yet - will begin after Stage 1 complete**

### APIs to Integrate:
1. OpenAI GPT-5 (nano for feedback, mini for generation)
2. Supabase (real-time data, user profiles, levels)
3. Stripe (payments, subscriptions)
4. Redis (AI response caching)
5. Job Queue (batched AI tasks)

### Cost Optimization:
- Pre-generate 30-level content per craving
- Cache all AI responses
- Batch AI calls for challenges
- Target: ≤ $0.01/user/month

---

## 🎨 STAGE 3: POLISH & PRODUCTION (FUTURE)

**Not started yet - will begin after Stage 2 complete**

### Features:
1. Admin panel (user engagement, coin economy, AI usage)
2. Real-time updates (WebSockets)
3. Performance optimization
4. SEO optimization
5. Production deployment (Vercel)
6. Monitoring & analytics

---

## 📝 NOTES & DECISIONS

### Mock Data Strategy:
- Use realistic mock data (names, stats, dates)
- Make it feel like 10M users exist
- Consistent mock user: "Alex Chen" (mock-user-123)
- Mock stats: 45-day streak, Level 12/30, 1,250 XP, 340 coins

### Design Principles:
- Clean, modern UI (Tailwind)
- Game-like elements (progress bars, badges, animations)
- Trust & credibility (stats, testimonials, social proof)
- Mobile-first responsive design
- Fast loading, smooth transitions

### Technical Decisions:
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Clerk Auth (when env vars present)
- Supabase (when env vars present)
- Mock mode fallback for everything

---

## 🎯 CURRENT FOCUS: PHASE 1C - REMAINING PAGES

**Next Steps:**
1. Build Forum and Battles pages (mock)
2. Add Progress/Share page
3. Verify complete flows

**Expected Outcome:**
- All core pages available with mock data
- Smooth navigation end-to-end
- Ready for Stage 2 integration

