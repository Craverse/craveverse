// API route for creating Stripe checkout sessions
// NOTE: Stripe disabled - all features are free
import { NextRequest, NextResponse } from 'next/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('stripe-checkout', traceId);
  
  // Stripe disabled - all features are free
  logger.info('Stripe checkout disabled - returning free tier message');
  return NextResponse.json({ 
    message: 'All features are currently free! No payment required.',
    free: true 
  }, {
    headers: { 'x-trace-id': traceId },
    status: 200
  });
}
