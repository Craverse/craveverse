// API route for AI-suggested forum replies
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createOpenAIClient } from '../../../../lib/openai-client';
import { CacheManager } from '../../../../lib/cache';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('forum-suggest-reply', traceId);

  try {
    if (isMockMode()) {
      const { threadTitle, craving } = await request.json();
      if (!threadTitle || !craving) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      logger.info('Mock mode: returning mock suggestion');
      return NextResponse.json({ suggestion: 'Keep going—you are stronger than your cravings.' , mockUsed: true}, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadTitle, craving, userContent } = await request.json();

    if (!threadTitle || !craving) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch user preferences for personalization
    const { supabaseServer } = await import('@/lib/supabase-client');
    const { data: userProfile } = await supabaseServer
      .from('users')
      .select('preferences, subscription_tier')
      .eq('clerk_user_id', userId)
      .single();

    // Create OpenAI client (rate limits handled internally)
    const openai = createOpenAIClient(userId, (userProfile?.subscription_tier as 'free' | 'plus' | 'ultra') || 'free');
    
    if (!openai) {
      logger.warn('OpenAI client not available for forum reply suggestion');
      return NextResponse.json(
        { error: 'AI features are currently unavailable' },
        { status: 503 }
      );
    }
    
    // Check cache first (cache key includes persona for better caching)
    const userPersona = userProfile?.preferences ? 
      (await import('@/lib/openai-client')).derivePersonaFromPreferences(userProfile.preferences) : 'encouraging';
    const cacheKey = `forum_suggestion:${threadTitle}:${craving}:${userPersona}`;
    const cachedSuggestion = await CacheManager.getForumTemplate(cacheKey);
    
    if (cachedSuggestion) {
      return NextResponse.json({ suggestion: cachedSuggestion, cached: true }, { headers: { 'x-trace-id': traceId } });
    }

    // Generate AI suggestion with user preferences
    try {
      const suggestion = await openai.generateForumReply(
        threadTitle,
        craving,
        userProfile?.preferences, // Pass preferences for persona-based tone
        userContent
      );

      // Cache the suggestion
      await CacheManager.setForumTemplate(cacheKey, suggestion);

      return NextResponse.json({ suggestion, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
    } catch (error) {
      logger.error('AI suggestion generation failed', { error });
      
      // Return fallback suggestion
      const fallbackSuggestions = {
        nofap: [
          "You're not alone in this journey. Every day is a new opportunity to build the person you want to become. Stay strong! 💪",
          "Remember why you started this journey. Your future self will thank you for the discipline you're building today.",
          "It's okay to struggle - what matters is that you keep trying. Progress isn't always linear, but every effort counts.",
        ],
        sugar: [
          "Sugar cravings are tough, but you're tougher! Try drinking water or eating a piece of fruit when the craving hits.",
          "Your body is adjusting to life without added sugar. The first few days are the hardest, but it gets easier!",
          "Remember, you're not depriving yourself - you're choosing health and energy over temporary satisfaction.",
        ],
        shopping: [
          "Impulse buying can be challenging to overcome. Try the 24-hour rule - wait a day before making any purchase.",
          "Think about what you're really trying to fill with shopping. Sometimes it's about emotions, not needs.",
          "Your future self will thank you for the money you're saving and the financial freedom you're building.",
        ],
        smoking_vaping: [
          "Quitting is one of the hardest things you'll ever do, but also one of the most rewarding. You've got this!",
          "Every hour without smoking is a victory. Celebrate the small wins and keep building momentum.",
          "Your body is healing with every passing day. The cravings will get weaker, but your resolve will get stronger.",
        ],
        social_media: [
          "Social media can be addictive, but you're taking control of your time and attention. That's powerful!",
          "Try replacing social media time with something that adds real value to your life - reading, exercise, or connecting with people in person.",
          "You're not missing out by being offline - you're gaining back your time, focus, and mental clarity.",
        ],
      };

      const fallbackList = fallbackSuggestions[craving as keyof typeof fallbackSuggestions] || fallbackSuggestions.nofap;
      const randomFallback = fallbackList[Math.floor(Math.random() * fallbackList.length)];

      return NextResponse.json({ suggestion: randomFallback, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }
  } catch (error) {
    logger.error('Forum suggestion error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

