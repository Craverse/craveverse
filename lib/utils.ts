import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized mock mode detection
 * Returns true if we should use mock mode (no real API calls)
 */
export function isMockMode(): boolean {
  // Explicit overrides come first
  if (process.env.NEXT_PUBLIC_FORCE_MOCK_MODE === 'true') {
    return true;
  }
  if (process.env.NEXT_PUBLIC_FORCE_LIVE_MODE === 'true') {
    return false;
  }

  // Check for Clerk keys
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  
  // Check for Supabase keys
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Mock mode if any critical env vars are missing or placeholder
  const hasValidClerk = Boolean(
    clerkPubKey &&
      clerkSecretKey &&
      clerkPubKey.startsWith('pk_') &&
      clerkSecretKey.startsWith('sk_') &&
      clerkPubKey.length > 20 &&
      clerkSecretKey.length > 20 &&
      !clerkPubKey.includes('placeholder') &&
      !clerkSecretKey.includes('placeholder'),
  );
    
  const hasValidSupabase = Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseServiceKey &&
      supabaseUrl.startsWith('https://') &&
      supabaseAnonKey.length > 20 &&
      supabaseServiceKey.length > 20 &&
      !supabaseUrl.includes('your-project') &&
      !supabaseAnonKey.includes('placeholder') &&
      !supabaseServiceKey.includes('placeholder'),
  );
  
  return !hasValidClerk || !hasValidSupabase;
}

/**
 * Assert that required environment variables exist
 * Throws error if any are missing or invalid
 */
export function assertEnv(varNames: string[]): void {
  const missing: string[] = [];
  
  for (const varName of varNames) {
    const value = process.env[varName];
    if (!value || value.includes('placeholder') || value.includes('your-')) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing or invalid environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value || value.includes('placeholder') || value.includes('your-')) {
    if (fallback) return fallback;
    throw new Error(`Environment variable ${key} is missing or invalid`);
  }
  return value;
}










