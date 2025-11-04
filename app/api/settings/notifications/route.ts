import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('settings-notifications-get', traceId);

  try {
    if (isMockMode()) {
      return NextResponse.json(
        {
          preferences: {
            email_enabled: true,
            push_enabled: false,
            daily_reminder_time: '09:00',
          },
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data, error } = await supabaseServer
      .from('notification_preferences')
      .select('email_enabled, push_enabled, daily_reminder_time')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch notification preferences', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json(
      {
        preferences: data ?? {
          email_enabled: true,
          push_enabled: false,
          daily_reminder_time: '09:00',
        },
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('settings-notifications-put', traceId);

  try {
    const body = await request.json();
    const email_enabled = Boolean(body.email_enabled);
    const push_enabled = Boolean(body.push_enabled);
    const daily_reminder_time = typeof body.daily_reminder_time === 'string' ? body.daily_reminder_time : null;

    if (isMockMode()) {
      return NextResponse.json(
        {
          success: true,
          preferences: {
            email_enabled,
            push_enabled,
            daily_reminder_time,
          },
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data, error } = await supabaseServer
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          email_enabled,
          push_enabled,
          daily_reminder_time,
        },
        { onConflict: 'user_id' }
      )
      .select('email_enabled, push_enabled, daily_reminder_time')
      .single();

    if (error) {
      logger.error('Failed to update notification preferences', { error: error.message });
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, preferences: data, mockUsed: false },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



