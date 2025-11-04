import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('settings-profile-get', traceId);

  try {
    if (isMockMode()) {
      return NextResponse.json(
        {
          profile: {
            name: 'Alex Chen',
            email: 'alex@example.com',
            avatar_url: null,
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

    const { data, error } = await supabaseServer
      .from('users')
      .select('name, email, avatar_url')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      logger.error('Failed to fetch profile', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json(
      { profile: data, mockUsed: false },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('settings-profile-put', traceId);

  try {
    const { name, avatar_url } = await request.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (isMockMode()) {
      return NextResponse.json(
        {
          success: true,
          profile: {
            name,
            email: 'alex@example.com',
            avatar_url: avatar_url ?? null,
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

    const { data, error } = await supabaseServer
      .from('users')
      .update({ name, avatar_url: avatar_url ?? null })
      .eq('clerk_user_id', userId)
      .select('name, email, avatar_url')
      .single();

    if (error) {
      logger.error('Failed to update profile', { error: error.message });
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, profile: data, mockUsed: false },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



