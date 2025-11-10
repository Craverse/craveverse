import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase-client';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type InteractionPayload = {
  pagePath?: string;
  buttonId?: string;
  buttonText?: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('analytics-interaction-api', traceId);

  try {
    const body = (await request.json()) as InteractionPayload;
    const pagePath = body.pagePath?.trim();
    const buttonId = body.buttonId?.trim();
    const buttonText = body.buttonText?.trim();
    const target = body.target?.trim();
    const metadata = body.metadata ?? {};

    if (!pagePath || !buttonId) {
      logger.warn('Missing required fields', { pagePath, buttonId });
      return NextResponse.json(
        { error: 'pagePath and buttonId are required' },
        { status: 400, headers: { 'x-trace-id': traceId } },
      );
    }

    // Mock mode: don't persist, just acknowledge
    if (isMockMode()) {
      logger.info('Mock mode: interaction logged without persistence', {
        pagePath,
        buttonId,
      });
      return NextResponse.json(
        {
          success: true,
          clickCount: 1,
          mockUsed: true,
        },
        { status: 200, headers: { 'x-trace-id': traceId } },
      );
    }

    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      logger.warn('Unauthorized analytics interaction');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: { 'x-trace-id': traceId } },
      );
    }

    const { data: userRecord, error: userFetchError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userFetchError || !userRecord) {
      logger.warn('No user record found for interaction', {
        clerkUserId,
        error: userFetchError?.message,
      });
      return NextResponse.json(
        { success: false, reason: 'user_not_ready' },
        { status: 202, headers: { 'x-trace-id': traceId } },
      );
    }

    const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
    const payloadMetadata = {
      ...(metadata || {}),
      ...(target ? { target } : {}),
    };

    const { data: existingRecord, error: fetchError } = await supabaseServer
      .from('button_interactions')
      .select('id, click_count')
      .eq('user_id', userRecord.id)
      .eq('page_path', normalizedPath)
      .eq('button_id', buttonId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Failed to fetch existing interaction', {
        clerkUserId,
        error: fetchError.message,
      });
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500, headers: { 'x-trace-id': traceId } },
      );
    }

    let clickCount = 1;

    if (existingRecord) {
      const { data: updatedRecord, error: updateError } = await supabaseServer
        .from('button_interactions')
        .update({
          click_count: (existingRecord.click_count ?? 0) + 1,
          button_text: buttonText,
          metadata: payloadMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)
        .select('click_count')
        .single();

      if (updateError) {
        logger.error('Failed to update interaction', {
          clerkUserId,
          error: updateError.message,
        });
        return NextResponse.json(
          { error: 'Database update failed' },
          { status: 500, headers: { 'x-trace-id': traceId } },
        );
      }

      clickCount = updatedRecord.click_count ?? (existingRecord.click_count ?? 0) + 1;
    } else {
      const { data: insertedRecord, error: insertError } = await supabaseServer
        .from('button_interactions')
        .insert({
          user_id: userRecord.id,
          page_path: normalizedPath,
          button_id: buttonId,
          button_text: buttonText,
          click_count: 1,
          metadata: payloadMetadata,
        })
        .select('click_count')
        .single();

      if (insertError) {
        logger.error('Failed to insert interaction', {
          clerkUserId,
          error: insertError.message,
        });
        return NextResponse.json(
          { error: 'Database insert failed' },
          { status: 500, headers: { 'x-trace-id': traceId } },
        );
      }

      clickCount = insertedRecord.click_count ?? 1;
    }

    logger.info('Interaction recorded', {
      clerkUserId,
      pagePath: normalizedPath,
      buttonId,
      clickCount,
    });

    return NextResponse.json(
      {
        success: true,
        clickCount,
        mockUsed: false,
      },
      { status: 200, headers: { 'x-trace-id': traceId } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Interaction logging failure', { error: message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-trace-id': traceId } },
    );
  }
}

