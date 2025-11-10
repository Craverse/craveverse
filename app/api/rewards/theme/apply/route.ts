// API route for applying cosmetic themes
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('theme-apply', traceId);

  try {
    const { themeId, personalization } = await request.json();

    if (!themeId) {
      return NextResponse.json({ error: 'themeId is required' }, { status: 400 });
    }

    if (isMockMode()) {
      logger.info('Mock mode: simulating theme application');
      return NextResponse.json(
        {
          success: true,
          themeId: 'premium',
          personalization: personalization || {},
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

    // Verify user has theme unlocked
    const { data: theme, error: themeError } = await supabaseServer
      .from('user_themes')
      .select('id, theme_id, theme_data')
      .eq('user_id', user.id)
      .eq('theme_id', themeId)
      .single();

    if (themeError || !theme) {
      logger.warn('Theme not unlocked', { themeId, error: themeError?.message });
      return NextResponse.json(
        { error: 'Theme not unlocked. Please purchase it from the shop first.' },
        { status: 404 }
      );
    }

    // Update or create user_settings with active theme
    const { data: existingSettings } = await supabaseServer
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const themePersonalization = personalization || theme.theme_data || {};

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabaseServer
        .from('user_settings')
        .update({
          active_theme_id: themeId,
          theme_personalization: themePersonalization,
        })
        .eq('id', existingSettings.id);

      if (updateError) {
        logger.error('Failed to update theme settings', { error: updateError.message });
        return NextResponse.json({ error: 'Failed to apply theme' }, { status: 500 });
      }
    } else {
      // Create new settings
      const { error: insertError } = await supabaseServer
        .from('user_settings')
        .insert({
          user_id: user.id,
          active_theme_id: themeId,
          theme_personalization: themePersonalization,
        });

      if (insertError) {
        logger.error('Failed to create theme settings', { error: insertError.message });
        return NextResponse.json({ error: 'Failed to apply theme' }, { status: 500 });
      }
    }

    logger.info('Theme applied', {
      userId: user.id,
      themeId,
      hasPersonalization: !!personalization,
    });

    return NextResponse.json(
      {
        success: true,
        themeId,
        personalization: themePersonalization,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

