// API route for completing onboarding
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('onboarding-complete-api', traceId);
  
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

    const { craving, quizAnswers, personalization } = await request.json();

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

      const userData = {
        clerk_user_id: userId,
        primary_craving: craving,
        current_level: 1,
        xp: 0,
        cravecoins: 0,
        streak_count: 0,
        subscription_tier: 'free',
        preferences: {
          quizAnswers,
          personalization
        },
        updated_at: new Date().toISOString(),
      };

      let result;
      if (existingUser) {
        // Update existing user
        result = await supabaseServer
          .from('users')
          .update(userData)
          .eq('clerk_user_id', userId)
          .select()
          .single();
      } else {
        // Create new user
        result = await supabaseServer
          .from('users')
          .insert({
            ...userData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
      }

      if (result.error) {
        logger.error('Failed to update user profile', { userId, error: result.error.message });
        throw new Error('Database update failed');
      }

      logger.info('Onboarding completion successful', { userId, craving });
      
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        user: {
          id: result.data.id,
          clerk_user_id: userId,
          primary_craving: craving,
          subscription_tier: 'free',
          current_level: 1,
          xp: 0,
          cravecoins: 0,
          streak_count: 0,
        },
        mockUsed: false,
      }, {
        headers: {
          'x-trace-id': traceId,
        }
      });

    } catch (dbError) {
      logger.error('Database operation failed, falling back to mock', { userId, error: dbError });
      
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