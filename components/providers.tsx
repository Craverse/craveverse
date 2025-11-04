'use client';

import React, { ReactNode } from 'react';
import { UserProvider } from '@/contexts/user-context';
import { AuthGate } from '@/components/auth-gate';
import { ErrorBoundary } from '@/components/error-boundary';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper
 * Separates client providers from server layout
 * Includes error boundary to prevent complete app crashes
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <AuthGate>
        <UserProvider>
          {children}
        </UserProvider>
      </AuthGate>
    </ErrorBoundary>
  );
}
