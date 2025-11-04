# CraveVerse Smoke Tests - Layer by Layer

## Test Execution Guide
Run these tests in order after starting the dev server: `npm run dev`

## Layer 1: Landing Page Tests

### Test 1.1: Landing Page Renders
1. Navigate to `http://localhost:3000/`
2. **Expected:** Page loads without errors
3. **Expected:** No navigation sidebar visible
4. **Expected:** "Start Your Journey" button is visible and clickable
5. **Expected:** No console errors

### Test 1.2: Landing Page Navigation
1. Click "Start Your Journey" button
2. **Expected:** Navigates to `/sign-up` page
3. **Expected:** Clerk sign-up form appears
4. **Expected:** No stuck loading states
5. **Expected:** Session storage has `authIntent: 'true'`

### Test 1.3: Public Route Visibility
1. On landing page, check browser console
2. **Expected:** No navigation links visible in sidebar
3. **Expected:** Footer links work (pricing, etc.)
4. **Expected:** No protected route links accessible

---

## Layer 2: AuthGate Tests

### Test 2.1: ClerkProvider Initialization
1. Navigate to landing page
2. Open React DevTools
3. **Expected:** ClerkProvider is in component tree
4. **Expected:** No "ClerkProvider not found" errors

### Test 2.2: Sign-Up Page Load
1. Navigate to `/sign-up`
2. **Expected:** Clerk sign-up component renders
3. **Expected:** No hydration errors
4. **Expected:** UserProvider doesn't crash

---

## Layer 3: UserProvider Tests

### Test 3.1: UserProvider Without Auth
1. On landing page (public route)
2. Check browser console
3. **Expected:** No "useUser must be used within ClerkProvider" errors
4. **Expected:** No infinite loops
5. **Expected:** Profile loading state handled gracefully

### Test 3.2: UserProvider With Auth
1. Sign up and authenticate
2. Navigate to dashboard
3. **Expected:** User profile loads successfully
4. **Expected:** No useEffect infinite loops
5. **Expected:** Profile data appears correctly

---

## Layer 4: Navigation Tests

### Test 4.1: Public Route Navigation Hidden
1. On landing page (`/`)
2. **Expected:** No AppShell sidebar visible
3. **Expected:** No protected route links in navigation
4. **Expected:** Page renders full-width

### Test 4.2: Protected Route Navigation Visible
1. Authenticate and navigate to `/dashboard`
2. **Expected:** AppShell sidebar visible on left
3. **Expected:** Navigation links to dashboard, forum, battles, etc. visible
4. **Expected:** Mobile bottom nav visible on mobile

### Test 4.3: Navigation Link Functionality
1. On authenticated route, click navigation links
2. **Expected:** All links navigate correctly
3. **Expected:** Active route highlighted
4. **Expected:** No broken links

---

## Layer 5: Route Protection Tests

### Test 5.1: Protected Route Redirect (Middleware)
1. Log out or clear auth
2. Navigate directly to `http://localhost:3000/dashboard`
3. **Expected:** Redirected to `/sign-up` automatically
4. **Expected:** Redirect happens before page renders

### Test 5.2: Protected Route Guard (Client-Side)
1. Try to access `/forum` without authentication
2. **Expected:** Shows loading state briefly
3. **Expected:** Redirects to `/sign-up`
4. **Expected:** No error flashes

### Test 5.3: Protected Route Access (Authenticated)
1. Sign up and authenticate
2. Navigate to `/dashboard`, `/forum`, `/shop`
3. **Expected:** All pages load successfully
4. **Expected:** No redirect loops
5. **Expected:** Content renders correctly

---

## Layer 6: Integration Flow Tests

### Test 6.1: Complete Sign-Up Flow
1. Start on landing page (`/`)
2. Click "Start Your Journey"
3. Complete Clerk sign-up
4. **Expected:** Redirected to dashboard or onboarding
5. **Expected:** User profile loads
6. **Expected:** No crashes during flow

### Test 6.2: Full User Journey
1. Sign up → Onboarding → Dashboard
2. **Expected:** Each step completes successfully
3. **Expected:** Navigation appears after onboarding
4. **Expected:** Data persists between pages
5. **Expected:** No console errors throughout

### Test 6.3: Sign-Out Flow
1. Sign out from settings or header
2. **Expected:** Redirected to landing page
3. **Expected:** Navigation sidebar disappears
4. **Expected:** Protected routes redirect if accessed

---

## Error Checklist

### Console Errors to Watch For:
- [ ] "Maximum update depth exceeded"
- [ ] "ClerkProvider not found"
- [ ] "useUser must be used within ClerkProvider"
- [ ] "Cannot read property of undefined"
- [ ] React hydration errors
- [ ] Navigation errors
- [ ] Uncaught promise rejections

### Visual Issues to Check:
- [ ] Buttons stuck in loading state
- [ ] Navigation sidebar on public routes
- [ ] Blank pages
- [ ] Infinite loading spinners
- [ ] Broken layouts

---

## Quick Test Command

```powershell
# Start server
npm run dev

# In another terminal, run quick tests:
Start-Sleep -Seconds 30; Write-Host "Testing landing page..."; try { $r = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing -TimeoutSec 10; Write-Host "✅ Landing page loads: $($r.StatusCode)" } catch { Write-Host "❌ Landing page failed: $($_.Exception.Message)" }; Write-Host "Testing sign-up page..."; try { $r = Invoke-WebRequest -Uri "http://localhost:3000/sign-up" -UseBasicParsing -TimeoutSec 10; Write-Host "✅ Sign-up page loads: $($r.StatusCode)" } catch { Write-Host "❌ Sign-up page failed: $($_.Exception.Message)" }
```

---

## Success Criteria

All tests pass when:
- ✅ Landing page renders without navigation
- ✅ "Get Started" button navigates successfully
- ✅ Clerk initializes on sign-up page
- ✅ UserProvider doesn't crash
- ✅ Protected routes redirect unauthenticated users
- ✅ Navigation only shows on authenticated routes
- ✅ Zero console errors
- ✅ All buttons functional
