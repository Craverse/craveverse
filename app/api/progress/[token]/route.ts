import { NextRequest, NextResponse } from 'next/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('progress-share-get', traceId);

  try {
    const { token } = await params;

    if (isMockMode()) {
      return NextResponse.json(
        {
          progress: {
            username: 'Alex Chen',
            tier: 'free',
            xp: 1250,
            coins: 340,
            streak: 45,
            levels_completed: 12,
            craving_type: 'nofap',
            generated_at: new Date().toISOString(),
          },
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } }
      );
    }

    const { data, error } = await supabaseServer
      .from('shareable_progress')
      .select('id, progress_data, view_count')
      .eq('public_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Progress link not found' }, { status: 404 });
    }

    const updatedCount = (data.view_count ?? 0) + 1;
    await supabaseServer
      .from('shareable_progress')
      .update({ view_count: updatedCount })
      .eq('id', data.id);

    return NextResponse.json(
      {
        progress: data.progress_data,
        viewCount: updatedCount,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



