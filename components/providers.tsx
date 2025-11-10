'use client';

import React, { ReactNode, useEffect } from 'react';
import { UserProvider } from '@/contexts/user-context';
import { AuthGate } from '@/components/auth-gate';
import { ErrorBoundary } from '@/components/error-boundary';
import { ButtonRegistry } from '@/components/button-registry';
import { useUserContext } from '@/contexts/user-context';
import { applyTheme, resetTheme } from '@/lib/theme-application';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Separates client providers from server layout
 * Includes error boundary to prevent complete app crashes
 * Includes button registry for tracking and testing
 */
function ThemeManager() {
  const { userProfile, isLoading } = useUserContext();
  const userId = userProfile?.id;

  useEffect(() => {
    let isCancelled = false;

    if (isLoading) {
      return;
    }

    if (!userId) {
      resetTheme();
      return;
    }

    const loadTheme = async () => {
      try {
        const response = await fetch('/api/user/settings', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load theme settings');
        }
        const data = await response.json();
        if (isCancelled) return;
        if (data.activeThemeId && data.themePersonalization) {
          applyTheme(data.themePersonalization);
        } else {
          resetTheme();
        }
      } catch {
        if (!isCancelled) {
          resetTheme();
        }
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
  return (
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
  );
}
