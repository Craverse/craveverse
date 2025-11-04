import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('map-levels', traceId);

  try {
    if (isMockMode()) {
      const levels = Array.from({ length: 30 }).map((_, index) => {
        const levelNumber = index + 1;
        return {
          id: `mock-level-${levelNumber}`,
          level_number: levelNumber,
          title: `Level ${levelNumber}`,
          status: levelNumber < 12 ? 'completed' : levelNumber === 12 ? 'current' : 'locked',
        };
      });
      return NextResponse.json({ levels, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, primary_craving, current_level')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found for map levels', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cravingType = user.primary_craving || 'nofap';

    const { data: levelsData, error: levelsError } = await supabaseServer
      .from('levels')
      .select('id, level_number, title')
      .eq('craving_type', cravingType)
      .order('level_number', { ascending: true });

    if (levelsError || !levelsData) {
      logger.error('Failed to load levels', { error: levelsError?.message });
      return NextResponse.json({ error: 'Failed to load levels' }, { status: 500 });
    }

    const completedLevelNumbers = new Set<number>();
    const { data: progressData } = await supabaseServer
      .from('user_progress')
      .select('level_id, levels!inner(level_number)')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);

    progressData?.forEach((entry: any) => {
      if (entry.levels?.level_number) {
        completedLevelNumbers.add(entry.levels.level_number);
      }
    });

    const levels = levelsData.map((level: { id: string; level_number: number; title: string }) => {
      const completed = completedLevelNumbers.has(level.level_number);
      let status: 'completed' | 'current' | 'locked' = 'locked';
      if (completed) status = 'completed';
      else if (level.level_number === user.current_level) status = 'current';
      else if (level.level_number < user.current_level) status = 'completed';
      return {
        id: level.id,
        level_number: level.level_number,
        title: level.title,
        status,
      };
    });

    return NextResponse.json(
      { levels, mockUsed: false },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



