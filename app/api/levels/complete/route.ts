// API route for completing levels
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createOpenAIClient } from '../../../../lib/openai-client';
import { CONFIG } from '../../../../lib/config';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { updateStreakWithPause } from '@/lib/streak-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('levels-complete', traceId);
  const recordJourneyEvent = async (
    userId: string,
    event: string,
    data: {
      success?: boolean;
      durationMs?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ) => {
    try {
      await supabaseServer.from('journey_events').insert({
        user_id: userId,
        event,
        success: data.success ?? null,
        duration_ms: data.durationMs ?? null,
        metadata: data.metadata ?? {},
      });
    } catch (telemetryError) {
      logger.warn('Level telemetry insert failed', {
        error: telemetryError instanceof Error ? telemetryError.message : 'unknown',
      });
    }
  };
  
  try {
    logger.info('Level completion request received');

    // Mock mode short-circuit
    if (isMockMode()) {
      const { levelId, userResponse, completionNotes } = await request.json();
      if (!levelId || !(userResponse || completionNotes)) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      logger.info('Mock mode: returning mocked completion response');
      return NextResponse.json({
        success: true,
        aiFeedback: 'Great job completing this level! Keep the momentum going.',
        rewards: { xp: 20, coins: 10 },
        newLevel: 2,
        mockUsed: true,
      }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { levelId, userResponse, completionNotes } = await request.json();

    if (!levelId || !(userResponse || completionNotes)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch user directly from Supabase
    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found, falling back to mock', { userId, error: userError?.message });
      return NextResponse.json({
        success: true,
        aiFeedback: 'Great job completing this level! Keep the momentum going.',
        rewards: { xp: 10, coins: 5 },
        newLevel: 2,
        mockUsed: true,
      }, { headers: { 'x-trace-id': traceId } });
    }

    // Get level details
    const { data: level, error: levelError } = await supabaseServer
      .from('levels')
      .select('*')
      .eq('id', levelId)
      .single();

    if (levelError || !level) {
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    // Check if user can access this level
    if (userProfile.subscription_tier === 'free' && level.level_number > 10) {
      return NextResponse.json(
        { error: 'Level locked. Upgrade to access all levels.' },
        { status: 403 }
      );
    }

    // Check if level is already completed
    const { data: existingProgress, error: progressError } = await supabaseServer
      .from('user_progress')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('level_id', levelId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check progress' },
        { status: 500 }
      );
    }

    if (existingProgress?.completed_at) {
      return NextResponse.json(
        { error: 'Level already completed' },
        { status: 400 }
      );
    }

    // Generate AI feedback with user preferences for personalization
    let aiFeedback = '';
    try {
      const openai = createOpenAIClient(userId, userProfile.subscription_tier as 'free' | 'plus' | 'ultra');
      
      if (!openai) {
        logger.warn('OpenAI client not available for level feedback');
        throw new Error('OpenAI client not available');
      }
      
      aiFeedback = await openai.generateLevelFeedback(
        level.level_number,
        level.craving_type,
        userResponse,
        userProfile.preferences // Pass preferences for persona-based tone
      );
    } catch (error) {
      logger.warn('AI feedback generation failed, using fallback', { error });
      // Use fallback template
      aiFeedback = CONFIG.FALLBACK_TEMPLATES.LEVEL_FEEDBACK[
        Math.floor(Math.random() * CONFIG.FALLBACK_TEMPLATES.LEVEL_FEEDBACK.length)
      ];
    }

    // Update user progress
    const { error: progressUpdateError } = await supabaseServer
      .from('user_progress')
      .upsert({
        user_id: userProfile.id,
        level_id: levelId,
        completed_at: new Date().toISOString(),
        ai_feedback: aiFeedback,
        user_response: userResponse || completionNotes || '',
        metadata: {
          completion_time: new Date().toISOString(),
          user_tier: userProfile.subscription_tier,
          completion_notes: completionNotes,
        },
      });

    if (progressUpdateError) {
      logger.error('Error updating progress', { error: progressUpdateError.message });
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    // Award XP and coins, and increment streak (using function for consistency)
    try {
      await updateStreakWithPause(userProfile.id, true);
    } catch (streakError) {
      logger.warn('Error updating streak with pause protection', { error: streakError instanceof Error ? streakError.message : 'Unknown error' });
    }

    const { error: rewardError } = await supabaseServer
      .from('users')
      .update({
        xp: userProfile.xp + level.xp_reward,
        cravecoins: userProfile.cravecoins + level.coin_reward,
        current_level: Math.max(userProfile.current_level, level.level_number + 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProfile.id);

    if (rewardError) {
      logger.error('Error awarding rewards', { error: rewardError.message });
      return NextResponse.json(
        { error: 'Failed to award rewards' },
        { status: 500 }
      );
    }

    // Log activity (best effort)
    try {
      await supabaseServer
        .from('activity_log')
        .insert({
          user_id: userProfile.id,
          action: 'level_completed',
          resource_type: 'level',
          resource_id: levelId,
          metadata: {
            level_number: level.level_number,
            xp_reward: level.xp_reward,
            coin_reward: level.coin_reward,
            user_response: userResponse,
            ai_feedback: aiFeedback,
          },
        });
    } catch (logError) {
      logger.warn('Error logging activity', { error: logError });
    }

    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - requestStart;
    await recordJourneyEvent(userProfile.id, 'level_complete_server', {
      success: true,
      durationMs: duration,
      metadata: {
        levelId,
        levelNumber: level.level_number,
        xpReward: level.xp_reward,
        coinReward: level.coin_reward,
      },
    });
    return NextResponse.json({
      success: true,
      aiFeedback,
      rewards: {
        xp: level.xp_reward,
        coins: level.coin_reward,
      },
      newLevel: level.level_number + 1,
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Level completion error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-trace-id': traceId } }
    );
  }
}
