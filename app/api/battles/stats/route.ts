// API route for battle statistics
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';


export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('battles-stats', traceId);
  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock battle stats');
      return NextResponse.json({ stats: { totalBattles: 0, wins: 0, losses: 0, winRate: 0, currentStreak: 0, bestStreak: 0 }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user id
    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for battle stats', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all battles for the user
    const { data: battles, error: battlesError } = await supabaseServer
      .from('battles')
      .select('status, winner_id, user1_id, user2_id, created_at')
      .or(`user1_id.eq.${userProfile.id},user2_id.eq.${userProfile.id}`)
      .eq('status', 'completed');

    if (battlesError) {
      logger.error('Error fetching battles', { error: battlesError.message });
      return NextResponse.json(
        { error: 'Failed to fetch battle statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalBattles = battles?.length || 0;
    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Sort battles by creation date (oldest first) to calculate streaks correctly
    const sortedBattles = battles?.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) || [];

    for (const battle of sortedBattles) {
      const isUser1 = battle.user1_id === userProfile.id;
      const isWinner = (isUser1 && battle.winner_id === 'user1') || 
                      (!isUser1 && battle.winner_id === 'user2');

      if (isWinner) {
        wins++;
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        losses++;
        tempStreak = 0;
      }
    }

    // Current streak is the streak from the most recent battles
    currentStreak = tempStreak;

    const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

    const stats = {
      totalBattles,
      wins,
      losses,
      winRate,
      currentStreak,
      bestStreak,
    };

    return NextResponse.json({ stats, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Battle stats error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
