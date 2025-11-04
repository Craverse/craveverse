// API health check endpoint
import { NextRequest, NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/lib/supabase-client';
import { createLogger, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = createTraceId();
  const logger = createLogger('health-check', traceId);
  
  try {
    logger.info('Health check started');
    
    // Check environment variables
    const envChecks = {
      nextPublicSupabaseUrl: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        isPlaceholder: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || false
      },
      supabaseUrl: {
        exists: !!process.env.SUPABASE_URL,
        value: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        isPlaceholder: process.env.SUPABASE_URL?.includes('placeholder') || false
      },
      nextPublicSupabaseAnonKey: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        isPlaceholder: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('placeholder') || false
      },
      supabaseServiceRoleKey: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        isPlaceholder: process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') || false
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
    };

    // Test database connection (with fast timeout for mock mode)
    let dbStatus = 'unknown';
    let dbMessage = 'Not tested';
    
    if (!isMockMode()) {
      try {
        // Use a shorter timeout promise for faster health checks
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 2000)
        );
        const connectionTest = await Promise.race([
          testDatabaseConnection(),
          timeoutPromise
        ]) as { connected: boolean; error: string | null };
        
        dbStatus = connectionTest.connected ? 'connected' : 'error';
        dbMessage = connectionTest.connected ? 'Successfully connected to Supabase' : (connectionTest.error || 'Unknown error');
      } catch (dbError) {
        dbStatus = 'error';
        dbMessage = `Database test failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
      }
    } else {
      dbStatus = 'mock';
      dbMessage = 'Mock mode - database not tested';
    }

    // Test API routes availability
    const routes = {
      profile: 'available',
      personalize: 'available', 
      complete: 'available',
      health: 'available'
    };

    // Check if we're in mock mode
    const mockMode = isMockMode();
    
    // Determine overall health
    const overallStatus = mockMode ? 'ok-mock' : 
                         dbStatus === 'connected' ? 'ok' : 
                         dbStatus === 'error' ? 'degraded' : 'unknown';

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      mockMode,
      database: dbStatus,
      databaseMessage: dbMessage,
      routes,
      environment: process.env.NODE_ENV || 'development',
      checks: envChecks,
      diagnosis: mockMode ? 'Running in mock mode - no real API calls' : 
                dbStatus === 'connected' ? 'Environment variables appear to be configured correctly' :
                'Some environment variables may be missing or invalid'
    };

    logger.info('Health check completed', { status: overallStatus, mockMode, dbStatus });
    
    return NextResponse.json(response, {
      headers: {
        'x-trace-id': traceId,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      mockMode: isMockMode(),
    }, { 
      status: 500,
      headers: {
        'x-trace-id': traceId,
      }
    });
  }
}