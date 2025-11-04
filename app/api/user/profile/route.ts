// API route for getting user profile and current level
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('user-profile-api', traceId);
  
  try {
    logger.info('Profile API request started');
    
    // Use centralized mock mode detection
    if (isMockMode()) {
      logger.info('Mock mode: Returning mock user profile');
      const mockProfile = {
        id: 'mock-user-123',
        clerk_user_id: 'mock-clerk-id',
        name: 'Alex Chen',
        email: 'alex@example.com',
        avatar_url: null,
        primary_craving: 'nofap',
        current_level: 12,
        xp: 1250,
        cravecoins: 340,
        streak_count: 45,
        subscription_tier: 'free',
        ai_summary: 'You\'re doing amazing! Keep up the great work on your NoFap journey.',
        preferences: {
          quizAnswers: {
            severity: 'moderate',
            triggers: ['stress', 'boredom'],
            attempts: 'multiple'
          },
          personalization: {
            motivation: 'health',
            support_level: 'high'
          }
        }
      };
      
      const mockLevel = {
        id: 'level-12',
        level_number: 12,
        title: 'Mindful Awareness',
        description: 'Practice 10 minutes of mindful breathing when urges arise',
        challenge_text: 'When you feel an urge, stop and take 10 deep breaths. Focus on your breathing and let the urge pass naturally.',
        coin_reward: 25,
        difficulty: 'moderate',
        craving_type: 'nofap'
      };
      
      return NextResponse.json({
        user: mockProfile,
        currentLevel: mockLevel,
        timestamp: new Date().toISOString(),
        mockUsed: true,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'x-trace-id': traceId,
          'x-profile-timestamp': new Date().toISOString(),
        }
      });
    }
    
    // REAL MODE: Use Clerk authentication
    const { userId } = await auth();
    
    if (!userId) {
      logger.warn('Unauthorized request - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Fetching user profile from database', { userId });

    // Fetch user profile from Supabase with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );
    
    const queryPromise = supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();
    
    const { data: userProfile, error: userError } = await Promise.race([queryPromise, timeoutPromise]) as any;
    
    if (userError || !userProfile) {
      logger.warn('User profile not found, falling back to mock', { userId, error: userError?.message });
      
      // Fallback to mock data
      const mockProfile = {
        id: 'fallback-user-123',
        clerk_user_id: userId,
        name: 'User',
        primary_craving: 'nofap',
        current_level: 1,
        xp: 0,
        cravecoins: 0,
        streak_count: 0,
        subscription_tier: 'free',
        ai_summary: 'Welcome to CraveVerse!',
        preferences: {}
      };
      
      return NextResponse.json({
        user: mockProfile,
        currentLevel: null,
        timestamp: new Date().toISOString(),
        mockUsed: true,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'x-trace-id': traceId,
          'x-profile-timestamp': new Date().toISOString(),
        }
      });
    }

    logger.info('User profile found', { userId, primary_craving: userProfile.primary_craving });

    // Get current level if user has completed onboarding
    let currentLevel = null;
    if (userProfile.primary_craving) {
      try {
        const { data: levelData, error: levelError } = await supabaseServer
          .from('levels')
          .select('*')
          .eq('craving_type', userProfile.primary_craving)
          .eq('level_number', userProfile.current_level)
          .single();

        if (!levelError && levelData) {
          currentLevel = levelData;
          logger.info('Current level found', { level: levelData.title });
        }
      } catch (levelErr) {
        logger.warn('Failed to fetch current level', { error: levelErr });
      }
    }
    
    return NextResponse.json({
      user: userProfile,
      currentLevel,
      timestamp: new Date().toISOString(),
      mockUsed: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'x-trace-id': traceId,
        'x-profile-timestamp': new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error('Profile fetch error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Fallback mock data on any error
    return NextResponse.json({
      user: {
        id: 'error-fallback-user-123',
        clerk_user_id: 'error-fallback-clerk-id',
        name: 'User',
        primary_craving: 'nofap',
        current_level: 1,
        xp: 0,
        cravecoins: 0,
        streak_count: 0,
        subscription_tier: 'free',
        ai_summary: 'Welcome to CraveVerse!',
        preferences: {}
      },
      currentLevel: null,
      timestamp: new Date().toISOString(),
      mockUsed: true,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'x-trace-id': traceId,
        'x-profile-timestamp': new Date().toISOString(),
      }
    });
  }
}

