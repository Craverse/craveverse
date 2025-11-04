import { NextRequest, NextResponse } from 'next/server';
import { createLogger, createTraceId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const logger = createLogger('debug-env', traceId);
  
  // Guard in production unless admin token provided
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      logger.warn('Unauthorized access to debug env endpoint');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
    clerkPubKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'SET' : 'NOT SET',
    clerkSecretKey: process.env.CLERK_SECRET_KEY ? 'SET' : 'NOT SET',
    isMockMode: !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' ||
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key' ||
                process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-key',
  };

  return NextResponse.json(body, { headers: { 'x-trace-id': traceId } });
}

