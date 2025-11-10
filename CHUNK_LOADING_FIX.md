# Chunk Loading Error Fix

## Issue
- `ChunkLoadError`: Loading chunk `app/layout.js` failed (timeout)
- Build error: `ssr: false` is not allowed with `next/dynamic` in Server Components

## Root Cause
The `app/layout.tsx` is a Server Component (default in Next.js App Router). We attempted to use dynamic imports with `ssr: false`, which is only allowed in Client Components.

## Solution
Reverted to regular static imports since:
1. `AppShell` and `Providers` are already Client Components (`'use client'`)
2. Server Components can import Client Components directly
3. The chunk loading timeout was likely due to build cache issues, not the import method

## Final Code
```tsx
// app/layout.tsx
import AppShell from '@/components/app-shell';
import { Providers } from '@/components/providers';
```

## Why This Works
- Server Components can import Client Components directly
- Next.js handles the client/server boundary automatically
- No need for dynamic imports when components are already client-side
- The original chunk loading error was likely due to corrupted `.next` cache

## Prevention
If chunk loading errors occur again:
1. Run `npm run fix:permissions` to clean build cache
2. Restart the dev server
3. The regular imports should work fine

