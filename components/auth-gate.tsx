'use client';

import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  // ALWAYS provide ClerkProvider - even in mock mode
  // Clerk components (SignUp, SignIn) REQUIRE ClerkProvider to function
  // ClerkProvider can work with placeholder keys (just won't authenticate)
  // This ensures:
  // 1. SignUp/SignIn components work on auth pages
  // 2. UserProvider can always safely call useUser()
  // 3. All Clerk hooks have the provider context they need
  
  // Get publishable key from environment (or use default)
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
  
  // ClerkProvider automatically reads from env, but we can pass it explicitly for clarity
  return (
    <ClerkProvider publishableKey={publishableKey || undefined}>
      {children}
    </ClerkProvider>
  );
}

