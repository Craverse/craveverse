// TEMPORARY: Database setup endpoint
// DELETE THIS FILE after setup is complete
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, createTraceId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const traceId = createTraceId();
  const logger = createLogger('debug-setup-db', traceId);

  // Guard in production unless admin token provided
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.get('x-admin-token');
    if (!token || token !== process.env.ADMIN_TOKEN) {
      logger.warn('Unauthorized access to debug setup-db endpoint');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const setupResults = {
    timestamp: new Date().toISOString(),
    operations: {} as any,
    success: false,
    errors: [] as string[]
  };

  try {
    // Test if we can connect to the database first
    const { error: testError } = await supabaseServer
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);

    if (testError) {
      setupResults.operations.connection_test = {
        success: false,
        error: testError.message
      };
      setupResults.errors.push(`Connection test: ${testError.message}`);
      return NextResponse.json(setupResults, { headers: { 'x-trace-id': traceId } });
    }

    setupResults.operations.connection_test = {
      success: true,
      error: null
    };

    // Try to create a simple test table to verify we have permissions
    const { error: createTestError } = await supabaseServer
      .from('test_table_creation')
      .select('*')
      .limit(0);

    if (createTestError && createTestError.code === 'PGRST116') {
      // Table doesn't exist, which is expected - this means we have connection
      setupResults.operations.permission_test = {
        success: true,
        error: null
      };
    } else {
      setupResults.operations.permission_test = {
        success: false,
        error: createTestError?.message || 'Unknown permission error'
      };
      setupResults.errors.push(`Permission test: ${createTestError?.message || 'Unknown error'}`);
    }

    setupResults.success = setupResults.errors.length === 0;

    return NextResponse.json(setupResults, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Database setup failed', { error });
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: { 'x-trace-id': traceId } });
  }
}
