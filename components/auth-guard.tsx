'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useLogger } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Client-side auth guard for protected pages
 * Redirects unauthenticated users to sign-up
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const logger = useLogger('AuthGuard');
  const { user, isLoaded } = useUser();
  const mock = isMockMode();

  useEffect(() => {
    if (isLoaded && !mock) {
      if (!user) {
        logger.info('User not authenticated - redirecting to sign-up');
        router.push('/sign-up');
      }
    }
  }, [user, isLoaded, mock, router, logger]);

  // Show loading while checking auth
  if (!isLoaded) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show redirect message if not authenticated (will redirect via useEffect)
  if (!mock && !user) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange mx-auto"></div>
          <p className="text-muted-foreground">Redirecting to sign up...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated or in mock mode
  return <>{children}</>;
}
