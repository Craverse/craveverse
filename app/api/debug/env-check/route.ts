// TEMPORARY: Diagnostic endpoint to check environment variables
// DELETE THIS FILE after diagnosis
import { NextResponse } from 'next/server';
import { createLogger, createTraceId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const traceId = createTraceId();
  const logger = createLogger('debug-env-check', traceId);
  
  // Guard in production unless admin token provided
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      logger.warn('Unauthorized access to debug env-check endpoint');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      nextPublicSupabaseUrl: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 
          'NOT SET',
        isPlaceholder: process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
      },
      supabaseUrl: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL ? 
          `${process.env.SUPABASE_URL.substring(0, 30)}...` : 
          'NOT SET',
        isPlaceholder: process.env.SUPABASE_URL === 'https://placeholder.supabase.co'
      },
      nextPublicSupabaseAnonKey: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        isPlaceholder: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key'
      },
      supabaseServiceRoleKey: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        isPlaceholder: process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-key'
      },
      clerkPublishableKey: {
        exists: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        length: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0
      },
      clerkSecretKey: {
        exists: !!process.env.CLERK_SECRET_KEY,
        length: process.env.CLERK_SECRET_KEY?.length || 0
      },
      openaiApiKey: {
        exists: !!process.env.OPENAI_API_KEY,
        length: process.env.OPENAI_API_KEY?.length || 0
      }
    },
    diagnosis: 'Unknown'
  };

  // Determine diagnosis
  if (!envCheck.checks.nextPublicSupabaseUrl.exists && !envCheck.checks.supabaseUrl.exists) {
    envCheck.diagnosis = 'CRITICAL: No Supabase URL configured';
  } else if (envCheck.checks.nextPublicSupabaseUrl.isPlaceholder || envCheck.checks.supabaseUrl.isPlaceholder) {
    envCheck.diagnosis = 'CRITICAL: Supabase URL is set to placeholder value';
  } else if (!envCheck.checks.nextPublicSupabaseAnonKey.exists || envCheck.checks.nextPublicSupabaseAnonKey.isPlaceholder) {
    envCheck.diagnosis = 'CRITICAL: Supabase anon key missing or placeholder';
  } else if (!envCheck.checks.supabaseServiceRoleKey.exists || envCheck.checks.supabaseServiceRoleKey.isPlaceholder) {
    envCheck.diagnosis = 'CRITICAL: Supabase service role key missing or placeholder';
  } else if (envCheck.checks.nextPublicSupabaseAnonKey.length < 100) {
    envCheck.diagnosis = 'WARNING: Supabase anon key seems too short';
  } else if (envCheck.checks.supabaseServiceRoleKey.length < 100) {
    envCheck.diagnosis = 'WARNING: Supabase service role key seems too short';
  } else {
    envCheck.diagnosis = 'Environment variables appear to be configured correctly';
  }

  return NextResponse.json(envCheck, { headers: { 'x-trace-id': traceId } });
}

