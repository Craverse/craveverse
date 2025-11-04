// API route for battles
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { QueueUtils } from '../../../lib/queue';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('battles-list', traceId);

  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock battles');
      return NextResponse.json({ activeBattles: [], completedBattles: [], mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for battles list', { userId, error: userError?.message });
      return NextResponse.json({ activeBattles: [], completedBattles: [], mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    // Get active battles (waiting or active)
    const { data: activeBattles, error: activeError } = await supabaseServer
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
      .or(`user1_id.eq.${userProfile.id},user2_id.eq.${userProfile.id}`)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false });

    if (activeError) {
      logger.error('Error fetching active battles', { error: activeError.message });
      return NextResponse.json(
        { error: 'Failed to fetch active battles' },
        { status: 500 }
      );
    }

    // Get completed battles
    const { data: completedBattles, error: completedError } = await supabaseServer
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
      .or(`user1_id.eq.${userProfile.id},user2_id.eq.${userProfile.id}`)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(20);

    if (completedError) {
      logger.error('Error fetching completed battles', { error: completedError.message });
      return NextResponse.json(
        { error: 'Failed to fetch completed battles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      activeBattles: activeBattles || [],
      completedBattles: completedBattles || [],
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Battles fetch error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('battles-create', traceId);

  try {
    if (isMockMode()) {
      const { craving_type, duration_hours } = await request.json();
      if (!craving_type || !duration_hours) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      logger.info('Mock mode: returning mock battle creation');
      return NextResponse.json({ success: true, battle: { id: 'mock-battle', status: 'waiting' }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { craving_type, duration_hours } = await request.json();

    if (!craving_type || !duration_hours) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for battle creation', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can create battles (rate limiting)
    const { data: recentBattles, error: recentError } = await supabaseServer
      .from('battles')
      .select('id')
      .eq('user1_id', userProfile.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentError) {
      logger.warn('Error checking recent battles', { error: recentError.message });
    }

    const dailyLimit = userProfile.subscription_tier === 'free' ? 1 : 5;
    if (recentBattles && recentBattles.length >= dailyLimit) {
      return NextResponse.json(
        { error: `Daily battle limit reached. You can create ${dailyLimit} battle(s) per day.` },
        { status: 429 }
      );
    }

    // Create battle
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration_hours * 60 * 60 * 1000);

    const { data: battle, error: battleError } = await supabaseServer
      .from('battles')
      .insert({
        user1_id: userProfile.id,
        user1_name: userProfile.name,
        craving_type,
        status: 'waiting',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        user1_tasks_completed: 0,
        user2_tasks_completed: 0,
      })
      .select(`
        id,
        user1_name,
        user2_name,
        craving_type,
        status,
        start_time,
        end_time,
        user1_tasks_completed,
        user2_tasks_completed,
        created_at
      `)
      .single();

    if (battleError) {
      logger.error('Error creating battle', { error: battleError.message });
      return NextResponse.json(
        { error: 'Failed to create battle' },
        { status: 500 }
      );
    }

    // Add job to queue for AI task generation
    await QueueUtils.scheduleBattleTasks(craving_type);

    // Log activity
    try {
      await supabaseServer
        .from('activity_log')
        .insert({
          user_id: userProfile.id,
          action: 'battle_created',
          resource_type: 'battle',
          resource_id: battle.id,
          metadata: {
            craving_type,
            duration_hours,
          },
        });
    } catch (logError) {
      logger.warn('Error logging activity', { error: logError });
    }

    return NextResponse.json({
      success: true,
      battle: {
        id: battle.id,
        user1_name: battle.user1_name,
        user2_name: battle.user2_name,
        craving_type: battle.craving_type,
        status: battle.status,
        start_time: battle.start_time,
        end_time: battle.end_time,
        user1_tasks_completed: battle.user1_tasks_completed,
        user2_tasks_completed: battle.user2_tasks_completed,
        created_at: battle.created_at,
      },
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Create battle error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
