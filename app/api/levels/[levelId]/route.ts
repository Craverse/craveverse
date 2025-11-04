import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ levelId: string }> }
) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('level-detail', traceId);

  try {
    const { levelId } = await params;

    if (isMockMode()) {
      logger.info('Mock mode: returning mock level detail');
      const num = Number(levelId.replace('level-', '')) || 1;
      return NextResponse.json({
        level: {
          id: levelId,
          level_number: num,
          title: `Level ${num}`,
          description: 'A focused step in your 30-level journey.',
          challenge_text: 'Perform 10 minutes of mindful breathing when urges arise.',
          xp_reward: 20,
          coin_reward: 10,
          difficulty: num < 10 ? 'easy' : num < 20 ? 'medium' : 'hard',
          craving_type: 'nofap',
        },
        mockUsed: true,
      }, { headers: { 'x-trace-id': traceId } });
    }

    const { data: level, error } = await supabaseServer
      .from('levels')
      .select('*')
      .eq('id', levelId)
      .single();

    if (error || !level) {
      logger.warn('Level not found', { levelId, error: error?.message });
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    return NextResponse.json({ level, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Level detail error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



