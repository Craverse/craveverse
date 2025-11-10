import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase-client';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type JourneyTelemetryPayload = {
  event?: string;
  phase?: string;
  durationMs?: number;
  success?: boolean;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('journey-telemetry-api', traceId);

  try {
    const body = (await request.json()) as JourneyTelemetryPayload;
    const event = body.event?.trim();

    if (!event) {
      logger.warn('Missing telemetry event type');
      return NextResponse.json(
        { error: 'event is required' },
        { status: 400, headers: { 'x-trace-id': traceId } },
      );
    }

    const telemetryRecord = {
      event,
      phase: body.phase ?? null,
      duration_ms: typeof body.durationMs === 'number' ? Math.round(body.durationMs) : null,
      success: typeof body.success === 'boolean' ? body.success : null,
      metadata: body.metadata ?? {},
    };

    if (isMockMode()) {
      logger.info('Mock mode telemetry', telemetryRecord);
      return NextResponse.json(
        { success: true, mockUsed: true },
        { status: 200, headers: { 'x-trace-id': traceId } },
      );
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      logger.warn('Telemetry received without authentication');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'x-trace-id': traceId } },
      );
    }

    const { data: userRecord, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userRecord) {
      logger.warn('User missing for telemetry event', { clerkUserId, error: userError?.message });
      return NextResponse.json(
        { success: false, reason: 'user_not_ready' },
        { status: 202, headers: { 'x-trace-id': traceId } },
      );
    }

    const { error: insertError } = await supabaseServer.from('journey_events').insert({
      user_id: userRecord.id,
      event: telemetryRecord.event,
      phase: telemetryRecord.phase,
      duration_ms: telemetryRecord.duration_ms,
      success: telemetryRecord.success,
      metadata: telemetryRecord.metadata,
    });

    if (insertError) {
      logger.error('Failed to record telemetry', { error: insertError.message });
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500, headers: { 'x-trace-id': traceId } },
      );
    }

    logger.info('Telemetry recorded', telemetryRecord);

    return NextResponse.json(
      { success: true, mockUsed: false },
      { status: 200, headers: { 'x-trace-id': traceId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Telemetry handler failure', { error: message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-trace-id': traceId } },
    );
  }
}

