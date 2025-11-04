import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('levels-list', traceId);

  try {
    const { searchParams } = new URL(request.url);
    const craving = searchParams.get('craving') || 'nofap';
    const limit = Number(searchParams.get('limit') || '30');

    if (isMockMode()) {
      logger.info('Mock mode: returning mock levels list');
      const mockLevels = Array.from({ length: Math.min(30, limit) }).map((_, idx) => ({
        id: `level-${idx + 1}`,
        level_number: idx + 1,
        title: `Level ${idx + 1}`,
        description: 'A focused step in your 30-level journey.',
        challenge_text: 'Perform 10 minutes of mindful breathing when urges arise.',
        xp_reward: 20,
        coin_reward: 10,
        difficulty: idx < 10 ? 'easy' : idx < 20 ? 'medium' : 'hard',
        craving_type: craving,
      }));
      return NextResponse.json({ levels: mockLevels, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { data: levels, error } = await supabaseServer
      .from('levels')
      .select('*')
      .eq('craving_type', craving)
      .order('level_number', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching levels', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch levels' }, { status: 500 });
    }

    return NextResponse.json({ levels: levels || [], mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Levels list error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



