// API route for forum threads
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('forum-threads-list', traceId);

  try {
    const { searchParams } = new URL(request.url);
    const craving = searchParams.get('craving') || 'all';
    const sort = searchParams.get('sort') || 'recent';

    if (isMockMode()) {
      logger.info('Mock mode: returning mock threads');
      return NextResponse.json({ threads: [] , mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    let query = supabaseServer
      .from('forum_posts')
      .select(`
        id,
        title,
        content,
        craving_type,
        upvotes,
        created_at,
        user_id,
        users!inner (
          name,
          avatar_url,
          subscription_tier
        ),
        forum_replies (id)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    // Filter by craving type
    if (craving !== 'all') {
      query = query.eq('craving_type', craving);
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        query = query.order('upvotes', { ascending: false });
        break;
      case 'trending':
        // Trending = recent posts with high engagement
        query = query
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('upvotes', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data: threads, error } = await query;

    if (error) {
      logger.error('Error fetching threads', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to fetch threads' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const transformedThreads = threads?.map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      content: thread.content,
      author_name: (thread.users as any)?.name,
      author_avatar: (thread.users as any)?.avatar_url,
      author_tier: (thread.users as any)?.subscription_tier,
      craving_type: thread.craving_type,
      upvotes: thread.upvotes,
      reply_count: thread.forum_replies?.length || 0,
      created_at: thread.created_at,
    })) || [];

    return NextResponse.json({ threads: transformedThreads, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Forum threads error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('forum-thread-create', traceId);

  try {
    if (isMockMode()) {
      const { title, content, craving_type } = await request.json();
      if (!title || !content || !craving_type) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      logger.info('Mock mode: returning mock thread creation');
      return NextResponse.json({ success: true, thread: { id: 'mock-thread', title, content, craving_type }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content, craving_type } = await request.json();

    if (!title || !content || !craving_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for thread creation', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user can create threads (rate limiting)
    const { data: recentPosts, error: recentError } = await supabaseServer
      .from('forum_posts')
      .select('id')
      .eq('user_id', userProfile.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (recentError) {
      logger.warn('Error checking recent posts', { error: recentError.message });
    }

    const dailyLimit = userProfile.subscription_tier === 'free' ? 1 : 10;
    if (recentPosts && recentPosts.length >= dailyLimit) {
      return NextResponse.json(
        { error: `Daily post limit reached. You can post ${dailyLimit} thread(s) per day.` },
        { status: 429 }
      );
    }

    // Create thread
    const { data: thread, error: threadError } = await supabaseServer
      .from('forum_posts')
      .insert({
        user_id: userProfile.id,
        title: title.trim(),
        content: content.trim(),
        craving_type,
        upvotes: 0,
        status: 'active',
      })
      .select(`
        id,
        title,
        content,
        craving_type,
        upvotes,
        created_at,
        users!inner (
          name,
          avatar_url,
          subscription_tier
        )
      `)
      .single();

    if (threadError) {
      logger.error('Error creating thread', { error: threadError.message });
      return NextResponse.json(
        { error: 'Failed to create thread' },
        { status: 500 }
      );
    }

    // Log activity
    try {
      await supabaseServer
        .from('activity_log')
        .insert({
          user_id: userProfile.id,
          action: 'forum_thread_created',
          resource_type: 'forum_post',
          resource_id: thread.id,
          metadata: {
            title: thread.title,
            craving_type: thread.craving_type,
          },
        });
    } catch (logError) {
      logger.warn('Error logging activity', { error: logError });
    }

    return NextResponse.json({
      success: true,
      thread: {
        id: thread.id,
        title: thread.title,
        content: thread.content,
        author_name: (thread.users as any)?.name,
        author_avatar: (thread.users as any)?.avatar_url,
        author_tier: (thread.users as any)?.subscription_tier,
        craving_type: thread.craving_type,
        upvotes: thread.upvotes,
        reply_count: 0,
        created_at: thread.created_at,
      },
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Create thread error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

