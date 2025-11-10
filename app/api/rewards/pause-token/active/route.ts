import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase-client';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('pause-token-active', traceId);

  try {
    if (isMockMode()) {
      const today = new Date();
      const end = new Date();
      end.setDate(today.getDate() + 2);
      return NextResponse.json(
        {
          pause: {
            id: 'mock-pause',
            startDate: today.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            days: 3,
          },
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } },
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
      logger.warn('User not found when checking active pause', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const { data: pause, error: pauseError } = await supabaseServer
      .from('streak_pauses')
      .select('id, start_date, end_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pauseError) {
      logger.error('Failed to check active pause', { error: pauseError.message });
      return NextResponse.json({ error: 'Failed to load active pause' }, { status: 500 });
    }

    if (!pause) {
      return NextResponse.json(
        { pause: null, mockUsed: false },
        { headers: { 'x-trace-id': traceId } },
      );
    }

    const startDate = pause.start_date;
    const endDate = pause.end_date;

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );

    return NextResponse.json(
      {
        pause: {
          id: pause.id,
          startDate,
          endDate,
          days: daysRemaining || 1,
        },
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } },
    );
  } catch (error) {
    logger.error('Unhandled error checking active pause', { error: error instanceof Error ? error.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


