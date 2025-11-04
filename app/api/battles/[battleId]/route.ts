// API route for individual battle details
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('battle-detail', traceId);
  try {
    const { battleId } = await params;
    if (isMockMode()) {
      logger.info('Mock mode: returning mock battle detail');
      return NextResponse.json({ battle: { id: battleId, user1_name: 'You', user2_name: 'Opponent', status: 'active', user1_tasks_completed: 0, user2_tasks_completed: 0 }, tasks: [], mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();
    if (userError || !userProfile) {
      logger.warn('User not found for battle detail', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get battle details
    const { data: battle, error: battleError } = await supabaseServer
      .from('battles')
      .select(`
        id,
        user1_name,
        user2_name,
        craving_type,
        status,
        start_time,
        end_time,
        winner_id,
        user1_tasks_completed,
        user2_tasks_completed,
        created_at
      `)
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Check if user is part of this battle
    const { data: userBattle, error: userBattleError } = await supabaseServer
      .from('battles')
      .select('user1_id, user2_id')
      .eq('id', battleId)
      .single();

    if (userBattleError || !userBattle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    if (userBattle.user1_id !== userProfile.id && userBattle.user2_id !== userProfile.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get battle tasks
    const { data: tasks, error: tasksError } = await supabaseServer
      .from('battle_tasks')
      .select(`
        id,
        title,
        description,
        difficulty,
        xp_reward,
        coin_reward,
        completed,
        completed_at
      `)
      .eq('battle_id', battleId)
      .order('created_at', { ascending: true });

    if (tasksError) {
      logger.error('Error fetching battle tasks', { error: tasksError.message });
      return NextResponse.json(
        { error: 'Failed to fetch battle tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      battle,
      tasks: tasks || [],
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Battle details error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

