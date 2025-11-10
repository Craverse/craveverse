// API route for fetching user's unlocked themes
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('themes', traceId);

  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock themes');
      return NextResponse.json(
        {
          themes: [
            {
              id: 'premium',
              name: 'Premium',
              unlockedAt: new Date().toISOString(),
              themeData: {
                colorScheme: {
                  primary: '#FF8C42',
                  secondary: '#FFA66B',
                  accent: '#E6732F',
                  background: '#FFF5ED',
                },
                motivationalQuotes: ['Keep going! You\'ve got this!'],
                badges: ['7-Day Warrior'],
              },
            },
          ],
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's unlocked themes
    const { data: themes, error: themesError } = await supabaseServer
      .from('user_themes')
      .select('id, theme_id, theme_data, unlocked_at')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    if (themesError) {
      logger.error('Failed to fetch themes', { error: themesError.message });
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
    }

    // Format themes
    const formattedThemes = (themes || []).map((theme: any) => ({
      id: theme.theme_id,
      name: theme.theme_id.charAt(0).toUpperCase() + theme.theme_id.slice(1).replace('_', ' '),
      unlockedAt: theme.unlocked_at,
      themeData: theme.theme_data || {},
    }));

    logger.info('Themes fetched', { userId: user.id, themeCount: formattedThemes.length });

    return NextResponse.json(
      {
        themes: formattedThemes,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

