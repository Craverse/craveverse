import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('progress-generate', traceId);

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (isMockMode()) {
      const token = 'mock-share-token';
      return NextResponse.json(
        {
          token,
          url: `${appUrl}/progress/${token}`,
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id, name, subscription_tier, xp, cravecoins, streak_count, current_level, primary_craving')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found for share', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { count: levelsCompleted } = await supabaseServer
      .from('user_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('completed_at', 'is', null);

    const snapshot = {
      username: user.name || 'CraveVerse Explorer',
      tier: user.subscription_tier,
      xp: user.xp,
      coins: user.cravecoins,
      streak: user.streak_count,
      levels_completed: levelsCompleted ?? 0,
      craving_type: user.primary_craving,
      generated_at: new Date().toISOString(),
    };

    const token = randomUUID();
    const { error: insertError } = await supabaseServer
      .from('shareable_progress')
      .insert({
        user_id: user.id,
        public_token: token,
        progress_data: snapshot,
      });

    if (insertError) {
      logger.error('Failed to insert shareable progress', { error: insertError.message });
      return NextResponse.json({ error: 'Failed to generate share link' }, { status: 500 });
    }

    return NextResponse.json(
      {
        token,
        url: `${appUrl}/progress/${token}`,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



