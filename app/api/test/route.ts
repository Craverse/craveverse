import { NextRequest, NextResponse } from 'next/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('test-endpoint', traceId);
  try {
    logger.info('Test endpoint hit');
    return NextResponse.json({ 
      success: true, 
      message: 'Test endpoint working',
      mockMode: isMockMode(),
      timestamp: new Date().toISOString()
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Test endpoint failed', { error });
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: { 'x-trace-id': traceId } });
  }
}

