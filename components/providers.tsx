'use client';
import React, { ReactNode, useEffect } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { UserProvider } from '@/contexts/user-context';
import { AuthGate } from '@/components/auth-gate';
import { ErrorBoundary } from '@/components/error-boundary';
import { ButtonRegistry } from '@/components/button-registry';
import { useUserContext } from '@/contexts/user-context';
import { applyTheme, resetTheme } from '@/lib/theme-application';
interface ProvidersProps {
  children: ReactNode;
}
<<<<<<< HEAD
/**
 * Client-side providers wrapper
 * Separates client providers from server layout
 * Includes error boundary to prevent complete app crashes
 * Includes button registry for tracking and testing
 */
=======

>>>>>>> 6142093e (v4)
function ThemeManager() {
  const { userProfile, isLoading } = useUserContext();
  const userId = userProfile?.id;
  useEffect(() => {
    let isCancelled = false;
<<<<<<< HEAD
    if (isLoading) {
      return;
    }
=======
    if (isLoading) return;
>>>>>>> 6142093e (v4)
    if (!userId) {
      resetTheme();
      return;
    }
    const loadTheme = async () => {
      try {
        const response = await fetch('/api/user/settings', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load theme');
        const data = await response.json();
        if (isCancelled) return;
        if (data.activeThemeId && data.themePersonalization) {
          applyTheme(data.themePersonalization);
        } else {
          resetTheme();
        }
      } catch {
        if (!isCancelled) resetTheme();
      }
    };
    loadTheme();
    return () => {
      isCancelled = true;
    };
  }, [userId, isLoading]);
  return null;
}
export function Providers({ children }: ProvidersProps) {
<<<<<<< HEAD
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\n" +
      "Copy .env.example → .env.local and fill in your Clerk keys from https://dashboard.clerk.com"
=======
  // DEBUG: This will print in browser console
  console.log('CLERK PK FROM ENV:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  // VALIDATION
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new Error(
      "MISSING: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\n" +
      "→ Rename .env → .env.local\n" +
      "→ Add your real key from https://dashboard.clerk.com"
>>>>>>> 6142093e (v4)
    );
  }

  if (!process.env.CLERK_SECRET_KEY) {
<<<<<<< HEAD
    throw new Error("Missing CLERK_SECRET_KEY in .env.local");
=======
    throw new Error("MISSING: CLERK_SECRET_KEY in .env.local");
>>>>>>> 6142093e (v4)
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <ErrorBoundary>
        <AuthGate>
          <UserProvider>
            <ButtonRegistry>
              <ThemeManager />
              {children}
            </ButtonRegistry>
          </UserProvider>
        </AuthGate>
      </ErrorBoundary>
    </ClerkProvider>
  );
}