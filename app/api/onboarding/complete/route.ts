// API route for completing onboarding
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

type OnboardingPayload = {
  craving: string;
  quizAnswers?: Record<string, unknown>;
  personalization?: Record<string, unknown>;
  quizVersion?: string;
};

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('onboarding-complete-api', traceId);
  
  const recordJourneyEvent = async (
    userId: string,
    event: string,
    payload: {
      phase?: string;
      success?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ) => {
    try {
      await supabaseServer.from('journey_events').insert({
        user_id: userId,
        event,
        phase: payload.phase ?? null,
        success: payload.success ?? null,
        metadata: payload.metadata ?? {},
      });
    } catch (telemetryError) {
      logger.warn('Unable to record onboarding telemetry', {
        error: telemetryError instanceof Error ? telemetryError.message : 'unknown',
      });
    }
  };

  try {
    logger.info('Onboarding completion request started');
    
    let userId: string;
    
    if (isMockMode()) {
      // Mock mode - use mock user ID
      userId = 'mock-user-123';
      logger.info('Using mock user ID for onboarding completion');
    } else {
      // Real mode - use Clerk authentication
      const authResult = await auth();
      userId = authResult.userId || '';
      
      if (!userId) {
        logger.warn('Unauthorized request - no userId');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { craving, quizAnswers = {}, personalization = {}, quizVersion = 'v1' } =
      (await request.json()) as OnboardingPayload;

    if (!craving) {
      logger.warn('Missing craving selection', { craving });
      return NextResponse.json(
        { error: 'Craving selection is required' },
        { status: 400 }
      );
    }

    logger.info('Processing onboarding completion', { userId, craving });

    if (isMockMode()) {
      // Mock mode - simulate successful update
      logger.info('Mock mode: Simulating onboarding completion');
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        user: {
          id: userId,
          primary_craving: craving,
          subscription_tier: 'free',
          current_level: 1,
          xp: 0,
          cravecoins: 0,
          streak_count: 0,
          is_newbie: false,
          onboarding_completed_at: new Date().toISOString(),
        },
        mockUsed: true,
      }, {
        headers: {
          'x-trace-id': traceId,
        }
      });
    }

    // REAL MODE: Update user profile in Supabase
    try {
      const { data: existingUser, error: fetchError } = await supabaseServer
        .from('users')
        .select('*')
        .eq('clerk_user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('Failed to fetch user for update', { userId, error: fetchError.message });
        throw new Error('Database error');
      }

      const nowIso = new Date().toISOString();
      const mergedPreferences = {
        ...(existingUser?.preferences ?? {}),
        onboarding: {
          quizAnswers,
          personalization,
          quizVersion,
          completedAt: nowIso,
        },
      };

      const userPayload = {
        primary_craving: craving,
        preferences: mergedPreferences,
        is_newbie: false,
        onboarding_completed_at: nowIso,
        updated_at: nowIso,
      };

      const userData = {
        clerk_user_id: userId,
        current_level: existingUser?.current_level ?? 1,
        xp: existingUser?.xp ?? 0,
        cravecoins: existingUser?.cravecoins ?? 0,
        streak_count: existingUser?.streak_count ?? 0,
        subscription_tier: existingUser?.subscription_tier ?? 'free',
        ...userPayload,
      };

      let dbUserId: string;
      let updatedUser;
      if (existingUser) {
        // Update existing user
        const { data, error } = await supabaseServer
          .from('users')
          .update(userData)
          .eq('clerk_user_id', userId)
          .select()
          .single();
        if (error) {
          logger.error('Failed to update user profile', { userId, error: error.message });
          throw new Error('Database update failed');
        }
        updatedUser = data;
        dbUserId = data.id;
      } else {
        // Create new user
        const { data, error } = await supabaseServer
          .from('users')
          .insert({
            ...userData,
            id: randomUUID(),
            created_at: nowIso,
          })
          .select()
          .single();
        if (error) {
          logger.error('Failed to create user profile', { userId, error: error.message });
          throw new Error('Database insert failed');
        }
        updatedUser = data;
        dbUserId = data.id;
      }

      // Upsert quiz responses
      const { error: quizError } = await supabaseServer
        .from('user_quiz_responses')
        .upsert(
          {
            user_id: dbUserId,
            quiz_version: quizVersion,
            responses: quizAnswers,
            derived_preferences: personalization,
            updated_at: nowIso,
          },
          { onConflict: 'user_id,quiz_version' }
        );

      if (quizError) {
        logger.error('Failed to store quiz responses', { userId, error: quizError.message });
        throw new Error('Quiz persistence failed');
      }

      logger.info('Onboarding completion successful', { userId, craving });
      await recordJourneyEvent(dbUserId, 'onboarding_complete_server', {
        phase: 'storage',
        success: true,
        metadata: {
          craving,
          hasPersonalization: Object.keys(personalization ?? {}).length > 0,
          quizVersion,
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        user: {
          id: dbUserId,
          clerk_user_id: userId,
          primary_craving: craving,
          subscription_tier: updatedUser.subscription_tier,
          current_level: updatedUser.current_level,
          xp: updatedUser.xp,
          cravecoins: updatedUser.cravecoins,
          streak_count: updatedUser.streak_count,
          is_newbie: false,
          onboarding_completed_at: updatedUser.onboarding_completed_at,
        },
        mockUsed: false,
      }, {
        headers: {
          'x-trace-id': traceId,
        }
      });

    } catch (dbError) {
      logger.error('Database operation failed, falling back to mock', { userId, error: dbError });
      await recordJourneyEvent(userId, 'onboarding_complete_server', {
        phase: 'storage',
        success: false,
        metadata: {
          craving,
          reason: dbError instanceof Error ? dbError.message : 'unknown',
        },
      });
      
      // Fallback to mock response
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully (fallback)',
        user: {
          id: 'fallback-user-123',
          clerk_user_id: userId,
          primary_craving: craving,
          subscription_tier: 'free',
          current_level: 1,
          xp: 0,
          cravecoins: 0,
          streak_count: 0,
        },
        mockUsed: true,
      }, {
        headers: {
          'x-trace-id': traceId,
        }
      });
    }
  } catch (error) {
    logger.error('Onboarding completion error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}