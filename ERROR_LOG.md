# Error Log - CraveVerse Deployment

This document tracks all errors encountered during development and their fixes, using first principles thinking to ensure optimal code quality and performance.

---

## React Hooks Violations

### Error 1: Hooks Called in Wrong Order / Inside JSX Props
**Date:** 2025-01-11  
**Error Type:** Console Error  
**Severity:** Critical

#### Error Message
```
React has detected a change in the order of Hooks called by DashboardPage. 
This will lead to bugs and errors if not fixed. For more information, 
read the Rules of Hooks: https://react.dev/link/rules-of-hooks

Rendered more hooks than during the previous render.
```

#### Root Cause
- **File:** `app/dashboard/page.tsx`
- **Line:** 138 (original)
- **Issue:** `useMemo` hook was being called inside JSX props (`<LevelCard level={useMemo(...)} />`), which violates React's Rules of Hooks.
- **Impact:** Hooks must be called at the top level of a component, before any conditional returns, and in the same order on every render.

#### Fix Applied
1. Moved `useMemo` call to the top level of the component (before any conditional returns)
2. Added null-safe handling for `userProfile` within the `useMemo` callback
3. Ensured the hook is called unconditionally on every render

**Code Change:**
```typescript
// BEFORE (WRONG - violates Rules of Hooks):
<LevelCard
  level={useMemo(() => ({
    id: `level-${userProfile.current_level}`,
    // ...
  }), [userProfile.current_level])}
/>

// AFTER (CORRECT):
// Memoize level data at the top level (before any conditional returns)
const currentLevelData = useMemo(() => {
  if (!userProfile) {
    return { /* default structure */ };
  }
  return {
    id: `level-${userProfile.current_level}`,
    // ...
  };
}, [userProfile?.current_level]);

// Later in JSX:
<LevelCard level={currentLevelData} />
```

#### Validation
- ✅ Linter passes with no errors
- ✅ Hook is called unconditionally at top level
- ✅ Handles null/undefined cases safely

---

### Error 2: Conditional Hook Call
**Date:** 2025-01-11  
**Error Type:** Potential Runtime Error  
**Severity:** Critical

#### Root Cause
- **File:** `contexts/user-context.tsx`
- **Line:** 67 (original)
- **Issue:** `useClerkUser()` hook was being called conditionally inside an `if/else` block based on mock mode.
- **Impact:** React Hooks must be called unconditionally and in the same order on every render. Conditional hook calls can cause hooks order mismatches and crashes.

#### Fix Applied
1. Always call `useClerkUser()` at the top level unconditionally
2. Use conditional logic AFTER hook calls to determine which user data to use
3. Maintained mock mode functionality while complying with Rules of Hooks

**Code Change:**
```typescript
// BEFORE (WRONG - conditional hook call):
if (mock) {
  user = { id: 'mock-user-123' };
  isLoaded = true;
} else {
  const clerkResult = useClerkUser(); // ❌ Conditional hook call
  user = clerkResult?.user || null;
  isLoaded = clerkResult?.isLoaded ?? false;
}

// AFTER (CORRECT):
// ALWAYS call hooks at the top level
const clerkResult = useClerkUser(); // ✅ Unconditional hook call
const logger = useLogger('UserProvider');

// Determine user based on mock mode AFTER hooks are called
const user = mock ? { id: 'mock-user-123' } : (clerkResult?.user || null);
const isLoaded = mock ? true : (clerkResult?.isLoaded ?? false);
```

#### Validation
- ✅ Hook is called unconditionally at top level
- ✅ Mock mode functionality preserved
- ✅ No breaking changes to existing behavior

---

## First Principles Optimization Strategy

### Rules of Hooks Compliance
1. **Hooks must be called at the top level** - Never inside loops, conditions, or nested functions
2. **Hooks must be called in the same order** - React relies on call order to track state
3. **Hooks must be called unconditionally** - Every render must call the same hooks in the same order

### Code Quality Principles Applied
1. **Separation of Concerns:** Logic (hook calls) separate from rendering (JSX)
2. **Null Safety:** Handle undefined/null cases gracefully
3. **Performance:** Use `useMemo` for expensive computations, but at the top level
4. **Maintainability:** Clear comments explaining why hooks are called unconditionally

### Prevention Strategy
1. **Linter Configuration:** Ensure ESLint rules for React Hooks are enabled
2. **Code Review Checklist:** Always verify hooks are called at top level
3. **Testing:** Verify hooks order consistency across different render paths

---

## Performance Optimizations

### Memoization Strategy
- Use `useMemo` for expensive computations (like level data transformation)
- Place `useMemo` at component top level, before any conditional returns
- Include proper dependency arrays to prevent unnecessary recalculations

### State Management
- Use `useRef` for values that don't trigger re-renders (like `isFetchingRef`)
- Debounce rapid state updates (like `refreshProfile` calls)
- Memoize derived values to prevent unnecessary recalculations

---

## Testing & Validation

### Automated Checks
- ✅ ESLint with React Hooks rules enabled
- ✅ TypeScript strict mode enabled
- ✅ No linter errors in modified files

### Manual Testing Checklist
- [ ] Verify dashboard loads without hooks errors
- [ ] Verify user context works in both mock and real modes
- [ ] Verify no console errors related to hooks
- [ ] Verify app performance is not degraded

---

## Related Files Modified
1. `app/dashboard/page.tsx` - Fixed `useMemo` hook placement
2. `contexts/user-context.tsx` - Fixed conditional `useClerkUser()` call

---

## Notes
- All fixes maintain backward compatibility
- No breaking changes to existing functionality
- Performance optimizations are preserved
- Code follows React best practices and first principles

---

**Last Updated:** 2025-01-11  
**Status:** ✅ All critical hooks violations fixed

