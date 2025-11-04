// TEMPORARY: Database schema diagnostic endpoint
// DELETE THIS FILE after diagnosis
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, createTraceId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const traceId = createTraceId();
  const logger = createLogger('debug-db-schema', traceId);
  
  // Guard in production unless admin token provided
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      logger.warn('Unauthorized access to debug db-schema endpoint');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const schemaCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tables: {} as any,
    diagnosis: 'Unknown'
  };

  try {
    // Check if users table exists
    try {
      const { data: usersData, error: usersError } = await supabaseServer
        .from('users')
        .select('id')
        .limit(1);
      
      schemaCheck.tables.users = {
        exists: !usersError,
        error: usersError?.message || null,
        hasData: usersData && usersData.length > 0
      };
    } catch (error) {
      schemaCheck.tables.users = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false
      };
    }

    // Check if levels table exists
    try {
      const { data: levelsData, error: levelsError } = await supabaseServer
        .from('levels')
        .select('id')
        .limit(1);
      
      schemaCheck.tables.levels = {
        exists: !levelsError,
        error: levelsError?.message || null,
        hasData: levelsData && levelsData.length > 0
      };
    } catch (error) {
      schemaCheck.tables.levels = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false
      };
    }

    // Check if user_progress table exists
    try {
      const { data: progressData, error: progressError } = await supabaseServer
        .from('user_progress')
        .select('id')
        .limit(1);
      
      schemaCheck.tables.user_progress = {
        exists: !progressError,
        error: progressError?.message || null,
        hasData: progressData && progressData.length > 0
      };
    } catch (error) {
      schemaCheck.tables.user_progress = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false
      };
    }

    // Check if activity_log table exists
    try {
      const { data: logData, error: logError } = await supabaseServer
        .from('activity_log')
        .select('id')
        .limit(1);
      
      schemaCheck.tables.activity_log = {
        exists: !logError,
        error: logError?.message || null,
        hasData: logData && logData.length > 0
      };
    } catch (error) {
      schemaCheck.tables.activity_log = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false
      };
    }

    // Check if pause_tokens table exists
    try {
      const { data: tokensData, error: tokensError } = await supabaseServer
        .from('pause_tokens')
        .select('id')
        .limit(1);
      
      schemaCheck.tables.pause_tokens = {
        exists: !tokensError,
        error: tokensError?.message || null,
        hasData: tokensData && tokensData.length > 0
      };
    } catch (error) {
      schemaCheck.tables.pause_tokens = {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasData: false
      };
    }

    // Determine diagnosis
    const missingTables = Object.entries(schemaCheck.tables)
      .filter(([, table]: [string, any]) => !table.exists)
      .map(([name]) => name);

    if (missingTables.length === 0) {
      schemaCheck.diagnosis = 'All required tables exist';
    } else if (missingTables.includes('users')) {
      schemaCheck.diagnosis = `CRITICAL: Missing core table 'users'. Missing tables: ${missingTables.join(', ')}`;
    } else {
      schemaCheck.diagnosis = `WARNING: Missing tables: ${missingTables.join(', ')}`;
    }

    return NextResponse.json(schemaCheck, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Schema check failed', { error });
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: { 'x-trace-id': traceId } });
  }
}
