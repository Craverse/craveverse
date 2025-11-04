// API route for leaderboard data
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('leaderboard', traceId);
  
  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock leaderboard');
      return NextResponse.json({ leaderboard: { overall: [], byCraving: {}, streaks: [], battles: [] }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists
    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for leaderboard', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get overall leaderboard (top 100 users by XP)
    const { data: overallData, error: overallError } = await supabaseServer
      .from('users')
      .select(`
        id,
        username,
        xp,
        streak_days,
        plan_id,
        current_craving_id,
        cravings!inner(name)
      `)
      .not('username', 'is', null)
      .order('xp', { ascending: false })
      .limit(100);

    if (overallError) {
      logger.error('Error fetching overall leaderboard', { error: overallError.message });
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data' },
        { status: 500 }
      );
    }

    // Get battle wins for each user
    const { data: battleData, error: battleError } = await supabaseServer
      .from('battles')
      .select('winner_id, user1_id, user2_id')
      .eq('status', 'completed')
      .not('winner_id', 'is', null);

    if (battleError) {
      logger.warn('Error fetching battle data', { error: battleError.message });
    }

    // Get level completion counts
    const { data: levelData, error: levelError } = await supabaseServer
      .from('user_levels')
      .select('user_id, status')
      .eq('status', 'completed');

    if (levelError) {
      logger.warn('Error fetching level data', { error: levelError.message });
    }

    // Process data
    const battleWins = battleData?.reduce((acc: Record<string, number>, battle: any) => {
      if (battle.winner_id === 'user1') {
        acc[battle.user1_id] = (acc[battle.user1_id] || 0) + 1;
      } else if (battle.winner_id === 'user2') {
        acc[battle.user2_id] = (acc[battle.user2_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    const levelCounts = levelData?.reduce((acc: Record<string, number>, level: any) => {
      acc[level.user_id] = (acc[level.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Transform data for leaderboard
    const overall = overallData?.map((user: any, index: number) => ({
      rank: index + 1,
      username: user.username,
      avatar: '', // Placeholder
      tier: user.plan_id || 'free',
      xp: user.xp || 0,
      streak: user.streak_days || 0,
      battles_won: battleWins[user.id] || 0,
      levels_completed: levelCounts[user.id] || 0,
      craving_type: (user.cravings as any)?.name || 'unknown',
    })) || [];

    // Get streaks leaderboard
    const streaks = overall
      .slice()
      .sort((a: any, b: any) => b.streak - a.streak)
      .map((user: any, index: number) => ({ ...user, rank: index + 1 }));

    // Get battles leaderboard
    const battles = overall
      .slice()
      .sort((a: any, b: any) => b.battles_won - a.battles_won)
      .map((user: any, index: number) => ({ ...user, rank: index + 1 }));

    // Group by craving type
    const byCraving = overall.reduce((acc: Record<string, any[]>, user: any) => {
      const craving = user.craving_type;
      if (!acc[craving]) {
        acc[craving] = [];
      }
      acc[craving].push(user);
      return acc;
    }, {} as Record<string, typeof overall>);

    // Sort each craving group by XP
    Object.keys(byCraving).forEach(craving => {
      byCraving[craving] = byCraving[craving]
        .slice()
        .sort((a: any, b: any) => b.xp - a.xp)
        .map((user: any, index: number) => ({ ...user, rank: index + 1 }));
    });

    const leaderboard = {
      overall,
      byCraving,
      streaks,
      battles,
    };

    return NextResponse.json({ leaderboard, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Leaderboard error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


