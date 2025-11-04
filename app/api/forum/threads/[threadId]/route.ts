// API route for individual thread details
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('forum-thread-detail', traceId);
  try {
    if (isMockMode()) {
      const { threadId } = await params;
      logger.info('Mock mode: returning mock thread detail');
      return NextResponse.json({ thread: { id: threadId, title: 'Mock Thread', content: 'Mock content', upvotes: 0, created_at: new Date().toISOString() }, replies: [], mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }
    const { threadId } = await params;

    // Get thread details
    const { data: thread, error: threadError } = await supabaseServer
      .from('forum_posts')
      .select(`
        id,
        title,
        content,
        craving_type,
        upvotes,
        created_at,
        ai_reply_suggested,
        users!inner (
          name,
          avatar_url,
          subscription_tier
        )
      `)
      .eq('id', threadId)
      .eq('status', 'active')
      .single();

    if (threadError || !thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Get replies
    const { data: replies, error: repliesError } = await supabaseServer
      .from('forum_replies')
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
      .eq('post_id', threadId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      logger.error('Error fetching replies', { error: repliesError.message });
      return NextResponse.json(
        { error: 'Failed to fetch replies' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedThread = {
      id: thread.id,
      title: thread.title,
      content: thread.content,
      author_name: (thread.users as any)?.name,
      author_avatar: (thread.users as any)?.avatar_url,
      author_tier: (thread.users as any)?.subscription_tier,
      craving_type: thread.craving_type,
      upvotes: thread.upvotes,
      created_at: thread.created_at,
      ai_reply_suggested: thread.ai_reply_suggested,
    };

    const transformedReplies = replies?.map((reply: any) => ({
      id: reply.id,
      content: reply.content,
      author_name: (reply.users as any)?.name,
      author_avatar: (reply.users as any)?.avatar_url,
      author_tier: (reply.users as any)?.subscription_tier,
      upvotes: reply.upvotes,
      created_at: reply.created_at,
      ai_generated: reply.ai_generated,
      parent_reply_id: reply.parent_reply_id,
    })) || [];

    return NextResponse.json({
      thread: transformedThread,
      replies: transformedReplies,
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Thread details error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

