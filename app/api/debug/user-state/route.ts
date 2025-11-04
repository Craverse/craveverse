// Temporary debug endpoint to diagnose user state issues
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, createTraceId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const logger = createLogger('debug-user-state', traceId);
  
  // Guard in production unless admin token provided
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      logger.warn('Unauthorized access to debug user-state endpoint');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'No user authenticated',
        clerkUserId: null,
        supabaseUser: null,
        timestamp: new Date().toISOString()
      }, { headers: { 'x-trace-id': traceId } });
    }

    logger.info('Checking user state', { userId });

    // Get user from Supabase
    const { data: supabaseUser, error: supabaseError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    const debugInfo = {
      clerkUserId: userId,
      supabaseUser: supabaseUser,
      supabaseError: supabaseError,
      hasUser: !!supabaseUser,
      hasPrimaryCraving: !!supabaseUser?.primary_craving,
      primaryCravingValue: supabaseUser?.primary_craving,
      userCreatedAt: supabaseUser?.created_at,
      userUpdatedAt: supabaseUser?.updated_at,
      timestamp: new Date().toISOString()
    };

    logger.info('Debug user state', debugInfo);
    return NextResponse.json(debugInfo, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Debug endpoint error', { error });
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500, headers: { 'x-trace-id': traceId } });
  }
}