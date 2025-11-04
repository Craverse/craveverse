// Stripe webhook handler for subscription events
// NOTE: Stripe disabled - all features are free
import { NextRequest, NextResponse } from 'next/server';
import { createLogger, createTraceId } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = createTraceId();
  const logger = createLogger('stripe-webhook', traceId);
  
  // Stripe disabled - all features are free
  logger.info('Stripe webhook disabled - all features are free');
  return NextResponse.json({ 
    message: 'Stripe webhook disabled - all features are free',
    received: true,
    free: true 
  }, { status: 200 });
}
