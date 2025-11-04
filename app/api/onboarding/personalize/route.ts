// API route for onboarding personalization
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createOpenAIClient } from '@/lib/openai-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('onboarding-personalize', traceId);
  
  try {
    logger.info('Onboarding personalization request started');
    
    let userId: string;
    
    if (isMockMode()) {
      userId = 'mock-user-123';
      logger.info('Using mock user ID for personalization');
    } else {
      const authResult = await auth();
      userId = authResult.userId || '';
    
    if (!userId) {
        logger.warn('Unauthorized request - no userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { craving, quizAnswers } = await request.json();

    if (!craving || !quizAnswers) {
      logger.warn('Missing required fields', { craving: !!craving, quizAnswers: !!quizAnswers });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    logger.info('Processing personalization request', { userId, craving });

    // MOCK MODE: Return mock personalization immediately
    if (isMockMode()) {
      logger.info('Mock mode: Returning mock personalization');
      const mockPersonalization = {
        introMessage: `Welcome to your ${craving} recovery journey! Based on your quiz answers, I can see you're serious about making a change. You've got this!`,
        customHints: [
          `Stay focused on your ${craving} recovery goals`,
          'Take it one day at a time',
          'Celebrate small victories',
          'Remember why you started this journey',
          'Use the community for support when you need it'
        ],
        motivation: 'You\'re taking the first step towards a better you. Every journey begins with a single step.',
        nextSteps: [
          'Complete your first level today',
          'Set up your daily reminder',
          'Join the community forum'
        ]
      };
      
      return NextResponse.json({
        ...mockPersonalization,
        mockUsed: true
      }, {
        headers: { 'x-trace-id': traceId }
      });
    }

    // REAL MODE: Get user profile to determine tier
    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();
    
    // If user doesn't exist, create them (fallback for webhook failure)
    if (userError || !userProfile) {
      logger.warn('No user profile found, creating fallback user', { userId, error: userError?.message });
      
      try {
        const { data: newUser, error: createError } = await supabaseServer
          .from('users')
          .insert({
            id: crypto.randomUUID(),
            clerk_user_id: userId,
            email: '', // Will be updated by Clerk webhook later
            name: 'New User',
            avatar_url: null,
            subscription_tier: 'free',
            xp: 0,
            cravecoins: 0,
            streak_count: 0,
            current_level: 1,
            primary_craving: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating fallback user', { userId, error: createError.message });
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        logger.info('Fallback user created successfully', { userId, newUserId: newUser.id });
        
        // Use the newly created user
        const safeUserProfile = newUser;
        
        // Create OpenAI client
        const openai = createOpenAIClient(userId, safeUserProfile.subscription_tier as 'free' | 'plus' | 'ultra');

        // Try AI personalization with fallback
        try {
          if (openai) {
            logger.info('Attempting AI personalization');
            const personalization = await openai.generateOnboardingPersonalization(
              quizAnswers,
              craving
            );
            logger.info('AI personalization successful');
            return NextResponse.json({
              ...personalization,
              mockUsed: false
            }, {
              headers: { 'x-trace-id': traceId }
            });
          } else {
            logger.warn('OpenAI client not available, using fallback');
            throw new Error('OpenAI client not available');
          }
        } catch (aiError) {
          logger.error('AI personalization failed, using fallback', { error: aiError });
          
          // FALLBACK: Return hardcoded personalization
          const fallbackPersonalization = {
            introMessage: `Welcome to your ${craving} recovery journey! You've got this!`,
            customHints: [
              `Stay focused on your ${craving} recovery goals`,
              'Take it one day at a time',
              'Celebrate small victories',
              'Remember why you started this journey'
            ],
            mockUsed: true
          };
          
          logger.info('Returning fallback personalization');
          return NextResponse.json(fallbackPersonalization, {
            headers: { 'x-trace-id': traceId }
          });
        }
      } catch (error) {
        logger.error('Error in fallback user creation', { userId, error });
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    // User profile exists, proceed with AI personalization
    const safeUserProfile = userProfile;

    // Create OpenAI client
    const openai = createOpenAIClient(userId, safeUserProfile.subscription_tier as 'free' | 'plus' | 'ultra');

    // Try AI personalization with fallback
    try {
      if (openai) {
        logger.info('Attempting AI personalization');
    const personalization = await openai.generateOnboardingPersonalization(
      quizAnswers,
      craving
    );
        logger.info('AI personalization successful');
        return NextResponse.json({
          ...personalization,
          mockUsed: false
        }, {
          headers: { 'x-trace-id': traceId }
        });
      } else {
        logger.warn('OpenAI client not available, using fallback');
        throw new Error('OpenAI client not available');
      }
    } catch (aiError) {
      logger.error('AI personalization failed, using fallback', { error: aiError });
      
      // FALLBACK: Return hardcoded personalization
      const fallbackPersonalization = {
        introMessage: `Welcome to your ${craving} recovery journey! You've got this!`,
        customHints: [
          `Stay focused on your ${craving} recovery goals`,
          'Take it one day at a time',
          'Celebrate small victories',
          'Remember why you started this journey'
        ],
        mockUsed: true
      };
      
      logger.info('Returning fallback personalization');
      return NextResponse.json(fallbackPersonalization, {
        headers: { 'x-trace-id': traceId }
      });
    }
  } catch (error) {
    logger.error('Personalization error', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // Return fallback personalization
    const fallback = {
      introMessage: `Welcome to your journey! You've got this!`,
      customHints: [
        'Start each day with intention',
        'Track your triggers carefully',
        'Celebrate small wins',
      ],
      mockUsed: true
    };

    return NextResponse.json(fallback, {
      headers: { 'x-trace-id': traceId }
    });
  }
}
