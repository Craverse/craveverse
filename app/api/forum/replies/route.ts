// API route for forum replies
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '../../../../lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

const supabase = supabaseServer;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('forum-reply-create', traceId);

  try {
    if (isMockMode()) {
      const { threadId, content } = await request.json();
      if (!threadId || !content) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      logger.info('Mock mode: returning mock reply');
      return NextResponse.json({ success: true, reply: { id: 'mock-reply', content }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId, content, parentReplyId } = await request.json();

    if (!threadId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for creating reply', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if thread exists
    const { data: thread, error: threadError } = await supabase
      .from('forum_posts')
      .select('id, status')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.status !== 'active') {
      return NextResponse.json({ error: 'Thread is not active' }, { status: 400 });
    }

    // Check if user can create replies (rate limiting)
    const { data: recentReplies, error: recentError } = await supabase
      .from('forum_replies')
      .select('id')
      .eq('user_id', userProfile.id)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (recentError) {
      logger.warn('Error checking recent replies', { error: recentError.message });
    }

    const hourlyLimit = userProfile.subscription_tier === 'free' ? 5 : 20;
    if (recentReplies && recentReplies.length >= hourlyLimit) {
      return NextResponse.json(
        { error: `Hourly reply limit reached. You can post ${hourlyLimit} replies per hour.` },
        { status: 429 }
      );
    }

    // Create reply
    const { data: reply, error: replyError } = await supabase
      .from('forum_replies')
      .insert({
        post_id: threadId,
        user_id: userProfile.id,
        content: content.trim(),
        parent_reply_id: parentReplyId || null,
        upvotes: 0,
        ai_generated: false,
      })
      .select(`
        id,
        content,
        upvotes,
        created_at,
        ai_generated,
        parent_reply_id,
        users!inner (
          name,
          avatar_url,
          subscription_tier
        )
      `)
      .single();

    if (replyError) {
      logger.error('Error creating reply', { error: replyError.message });
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await supabase
        .from('activity_log')
        .insert({
          user_id: userProfile.id,
          action: 'forum_reply_created',
          resource_type: 'forum_reply',
          resource_id: reply.id,
          metadata: {
            thread_id: threadId,
            parent_reply_id: parentReplyId,
          },
        });
    } catch (logError) {
      logger.warn('Error logging activity', { error: logError });
    }

    return NextResponse.json({
      success: true,
      reply: {
        id: reply.id,
        content: reply.content,
        author_name: (reply.users as any)?.name,
        author_avatar: (reply.users as any)?.avatar_url,
        author_tier: (reply.users as any)?.subscription_tier,
        upvotes: reply.upvotes,
        created_at: reply.created_at,
        ai_generated: reply.ai_generated,
        parent_reply_id: reply.parent_reply_id,
      },
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Create reply error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

