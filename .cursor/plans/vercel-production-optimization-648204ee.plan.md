<!-- 648204ee-b8d4-41b2-b623-313954ee14de e301e3bc-777d-4d6a-8647-91f1dd4601d0 -->
# Fix Signup Loop and Comprehensive Testing Strategy

## Problem Analysis

After successful signup, Clerk redirects to `/` (landing page), but:

1. Landing page has no logic to redirect authenticated users
2. SignUp component lacks redirect URL configuration
3. No post-signup onboarding check on landing page
4. Middleware doesn't redirect authenticated users away from public routes

## Phase 1: Fix Signup Redirect Loop

### 1.1 Configure Clerk SignUp Redirect URLs

**File:** `app/sign-up/[[...sign-up]]/page.tsx`

- Add `afterSignUpUrl` prop to `<SignUp />` pointing to `/onboarding`
- Add `fallbackRedirectUrl` prop pointing to `/dashboard`
- Ensure Clerk handles redirects after successful signup

### 1.2 Add Landing Page Auth Check

**File:** `app/page.tsx`

- Import `useUser` from `@clerk/nextjs` and `useUserContext`
- Add `useEffect` to check if user is authenticated
- If authenticated and onboarding incomplete → redirect to `/onboarding`
- If authenticated and onboarding complete → redirect to `/dashboard`
- Only run redirect logic in non-mock mode

### 1.3 Enhance Middleware Redirect Logic

**File:** `middleware.ts`

- After auth check, if user is authenticated and on public route (`/`), redirect based on onboarding status
- Use server-side check via `hasCompletedOnboarding()` from `lib/auth-utils.ts`
- Redirect to `/onboarding` if incomplete, `/dashboard` if complete

### 1.4 Add Onboarding Status Check Utility

**File:** `lib/auth-utils.ts`

- Ensure `hasCompletedOnboarding()` function works correctly
- Add server-side helper to get onboarding status without full profile fetch

## Phase 2: Comprehensive Testing Strategy

### 2.1 Layer 1: Terminal & Build Validation

**Script:** `scripts/test-layer1-terminal.ps1` (new)

- Check Node.js version (>=18.0.0)
- Verify all dependencies installed (`npm list --depth=0`)
- Run TypeScript compilation (`npm run type-check`)
- Run ESLint (`npm run lint`)
- Check for environment variables (`.env.local` exists)
- Verify no port conflicts (3000, 5432, etc.)
- Test build process (`npm run build`)

### 2.2 Layer 2: Authentication Flow Testing

**Test Cases:**

1. **Landing Page → Signup**

- Click "Get Started" button → navigates to `/sign-up`
- SignUp component renders correctly
- Clerk provider is active

2. **Signup → Redirect**

- Complete signup form
- After successful signup → redirects to `/onboarding` (not `/`)
- User is authenticated (verified via `useUser()`)

3. **Authenticated User on Landing Page**

- If user visits `/` while authenticated:
- Redirects to `/onboarding` if `primary_craving` is null
- Redirects to `/dashboard` if `primary_craving` is set

4. **Sign-In Flow**

- Navigate to `/sign-in`
- Complete sign-in → redirects based on onboarding status
- No redirect loops

### 2.3 Layer 3: Onboarding Flow Testing

**Test Cases:**

1. **Onboarding Page Access**

- Unauthenticated user → redirected to `/sign-up`
- Authenticated user without `primary_craving` → can access
- Authenticated user with `primary_craving` → redirected to `/dashboard`

2. **Onboarding Steps**

- Step 1: Craving selection works
- Step 2: Quiz completion works
- Step 3: AI personalization loads (or mock in dev)
- Step 4: Results display correctly
- Completion API call succeeds
- After completion → redirects to `/dashboard`

3. **Onboarding Data Persistence**

- Verify data saved to Supabase (or mock)
- `primary_craving` is set correctly
- `preferences` contains quiz answers

### 2.4 Layer 4: Dashboard & Protected Routes Testing

**Test Cases:**

1. **Dashboard Access**

- Authenticated + onboarding complete → dashboard loads
- Authenticated + onboarding incomplete → redirects to `/onboarding`
- Unauthenticated → redirects to `/sign-up`

2. **Protected Routes**

- `/battles`, `/forum`, `/leaderboard` → require auth
- Middleware redirects unauthenticated users to `/sign-up`
- Authenticated users can access

3. **User Profile Loading**

- `UserContext` fetches profile correctly
- Profile data displays in dashboard
- Loading states work correctly

### 2.5 Layer 5: API Endpoint Testing

**Test Script:** `scripts/test-layer5-api.ps1` (new)

- Test `/api/health` endpoint
- Test `/api/onboarding/complete` (POST)
- Test `/api/user/profile` (GET)
- Test `/api/battles` (GET)
- Test `/api/forum/threads` (GET)
- Verify authentication required for protected endpoints
- Test rate limiting (if applicable)

### 2.6 Layer 6: Runtime Error Monitoring

**Script:** `scripts/test-layer6-runtime.ps1` (new)

- Monitor terminal for errors during dev server startup
- Check browser console for client-side errors
- Verify no infinite loops in `useEffect` hooks
- Check for React hydration errors
- Monitor network requests for 401/403/500 errors
- Verify Clerk webhook handler works (`/api/webhooks/clerk`)

### 2.7 Layer 7: Integration Flow Testing

**End-to-End Scenarios:**

1. **New User Journey**

- Landing page → Signup → Onboarding → Dashboard
- Verify data persists between steps
- No redirect loops

2. **Returning User Journey**

- Sign-in → Dashboard (if onboarding complete)
- Sign-in → Onboarding (if onboarding incomplete)

3. **Session Persistence**

- Refresh page → stays on current route
- Close tab → reopen → session persists (if Clerk configured)

## Phase 3: Diagnostic Tools

### 3.1 Create Diagnostic Script

**File:** `scripts/diagnose-auth-flow.ps1` (new)

- Check Clerk configuration (keys present)
- Check Supabase configuration (keys present)
- Test Clerk API connectivity
- Test Supabase API connectivity
- Verify middleware is active
- Check for common errors in logs

### 3.2 Add Debug Mode

**File:** `lib/config.ts` or `lib/utils.ts`

- Add `DEBUG_AUTH_FLOW` environment variable
- Log all redirects and auth checks
- Show auth state in UI (dev mode only)

## Phase 4: Error Handling & Edge Cases

### 4.1 Handle Clerk Errors

- Network failures during signup
- Invalid Clerk keys
- Clerk service downtime

### 4.2 Handle Database Errors

- Supabase connection failures
- User profile fetch failures
- Onboarding completion failures

### 4.3 Handle Edge Cases

- User signs up but webhook fails
- User completes onboarding but profile update fails
- Multiple tabs open simultaneously

## Implementation Order

1. **Fix Signup Redirect (Phase 1.1-1.2)** - Highest priority
2. **Add Landing Page Auth Check (Phase 1.2)** - Prevents loop
3. **Enhance Middleware (Phase 1.3)** - Server-side safety net
4. **Create Testing Scripts (Phase 2)** - Validate fixes
5. **Run Layer-by-Layer Tests (Phase 2.1-2.7)** - Comprehensive validation
6. **Add Diagnostic Tools (Phase 3)** - Future debugging
7. **Handle Edge Cases (Phase 4)** - Production readiness

## Testing Checklist

- [ ] Landing page redirects authenticated users
- [ ] Signup redirects to `/onboarding` after completion
- [ ] Onboarding page accessible only to authenticated users
- [ ] Dashboard redirects incomplete onboarding users
- [ ] Middleware protects routes correctly
- [ ] No redirect loops in any flow
- [ ] Terminal shows no errors
- [ ] Browser console shows no errors
- [ ] All API endpoints respond correctly
- [ ] User profile loads correctly
- [ ] Mock mode works for development

## Files to Modify

1. `app/sign-up/[[...sign-up]]/page.tsx` - Add redirect URLs
2. `app/page.tsx` - Add auth check and redirect logic
3. `middleware.ts` - Enhance redirect logic for authenticated users
4. `lib/auth-utils.ts` - Verify onboarding check function
5. `scripts/test-layer1-terminal.ps1` - New testing script
6. `scripts/test-layer5-api.ps1` - New API testing script
7. `scripts/test-layer6-runtime.ps1` - New runtime monitoring script
8. `scripts/diagnose-auth-flow.ps1` - New diagnostic script

### To-dos

- [ ] Configure Clerk SignUp component with afterSignUpUrl and fallbackRedirectUrl in app/sign-up/[[...sign-up]]/page.tsx
- [ ] Add authentication check to landing page (app/page.tsx) to redirect authenticated users to /onboarding or /dashboard
- [ ] Enhance middleware.ts to redirect authenticated users away from public routes based on onboarding status
- [ ] Verify and fix hasCompletedOnboarding() function in lib/auth-utils.ts
- [ ] Create scripts/test-layer1-terminal.ps1 for terminal and build validation
- [ ] Create scripts/test-layer5-api.ps1 for API endpoint testing
- [ ] Create scripts/test-layer6-runtime.ps1 for runtime error monitoring
- [ ] Create scripts/diagnose-auth-flow.ps1 for comprehensive auth flow diagnostics
- [ ] Test complete authentication flow: landing → signup → onboarding → dashboard
- [ ] Test all protected routes require authentication and redirect correctly
- [ ] Test complete onboarding flow from start to dashboard redirect
- [ ] Validate no redirect loops occur in any user journey scenario