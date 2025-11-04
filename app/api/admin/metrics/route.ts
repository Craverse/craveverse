// API route for admin metrics
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('admin-metrics', traceId);

  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock admin metrics');
      return NextResponse.json({ metrics: { totalUsers: 0, activeUsers: 0, totalRevenue: 0, monthlyRevenue: 0, aiCosts: 0, aiCostPerUser: 0, conversionRate: 0, churnRate: 0, topFeatures: [], userTiers: [], recentActivity: [] }, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is admin
    const { data: adminUser, error: adminError } = await supabaseServer
      .from('users')
      .select('plan_id')
      .eq('clerk_user_id', userId)
      .single();

    if (adminError || !adminUser || adminUser.plan_id !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '7d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Get total users
    const { count: totalUsers, error: totalUsersError } = await supabaseServer
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (totalUsersError) {
      logger.error('Error fetching total users', { error: totalUsersError.message });
      return NextResponse.json(
        { error: 'Failed to fetch user metrics' },
        { status: 500 }
      );
    }

    // Get active users (users who have logged in within the timeframe)
    const { count: activeUsers, error: activeUsersError } = await supabaseServer
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', startDate.toISOString());

    if (activeUsersError) {
      logger.error('Error fetching active users', { error: activeUsersError.message });
      return NextResponse.json(
        { error: 'Failed to fetch active user metrics' },
        { status: 500 }
      );
    }

    // Get revenue data
    const { data: revenueData, error: revenueError } = await supabaseServer
      .from('transactions')
      .select('amount, created_at')
      .eq('status', 'completed')
      .eq('type', 'subscription');

    if (revenueError) {
      logger.error('Error fetching revenue data', { error: revenueError.message });
      return NextResponse.json(
        { error: 'Failed to fetch revenue metrics' },
        { status: 500 }
      );
    }

    const totalRevenue = revenueData?.reduce((sum: number, transaction: any) => sum + transaction.amount, 0) || 0;
    const monthlyRevenue = revenueData?.filter((transaction: any) => 
      new Date(transaction.created_at) >= startDate
    ).reduce((sum: number, transaction: any) => sum + transaction.amount, 0) || 0;

    // Get AI costs
    const { data: aiUsageData, error: aiUsageError } = await supabaseServer
      .from('ai_usage_log')
      .select('cost_usd, created_at')
      .gte('created_at', startDate.toISOString());

    if (aiUsageError) {
      logger.error('Error fetching AI usage data', { error: aiUsageError.message });
      return NextResponse.json(
        { error: 'Failed to fetch AI cost metrics' },
        { status: 500 }
      );
    }

    const aiCosts = aiUsageData?.reduce((sum: number, usage: any) => sum + usage.cost_usd, 0) || 0;
    const aiCostPerUser = (totalUsers && totalUsers > 0) ? aiCosts / totalUsers : 0;

    // Get user tier distribution
    const { data: userTiersData, error: userTiersError } = await supabaseServer
      .from('users')
      .select('plan_id')
      .not('plan_id', 'is', null);

    if (userTiersError) {
      logger.error('Error fetching user tiers', { error: userTiersError.message });
      return NextResponse.json(
        { error: 'Failed to fetch user tier metrics' },
        { status: 500 }
      );
    }

    const tierCounts = userTiersData?.reduce((acc: Record<string, number>, user: any) => {
      const tier = user.plan_id || 'free';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const userTiers = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count: count as number,
      percentage: (totalUsers && totalUsers > 0) ? Math.round(((count as number) / totalUsers) * 100) : 0,
    }));

    // Get top AI features
    const { data: topFeaturesData, error: topFeaturesError } = await supabaseServer
      .from('ai_usage_log')
      .select('feature')
      .gte('created_at', startDate.toISOString());

    if (topFeaturesError) {
      logger.error('Error fetching top features', { error: topFeaturesError.message });
      return NextResponse.json(
        { error: 'Failed to fetch feature metrics' },
        { status: 500 }
      );
    }

    const featureCounts = topFeaturesData?.reduce((acc: Record<string, number>, usage: any) => {
      const feature = usage.feature || 'unknown';
      acc[feature] = (acc[feature] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const topFeatures = Object.entries(featureCounts)
      .map(([name, usage]) => ({ name, usage }))
      .sort((a: any, b: any) => b.usage - a.usage)
      .slice(0, 5);

    // Get recent activity
    const { data: recentActivityData, error: recentActivityError } = await supabaseServer
      .from('activity_log')
      .select('action, user_id, created_at, users!inner(name)')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentActivityError) {
      logger.error('Error fetching recent activity', { error: recentActivityError.message });
      return NextResponse.json(
        { error: 'Failed to fetch activity metrics' },
        { status: 500 }
      );
    }

    const recentActivity = recentActivityData?.map((activity: any) => ({
      action: activity.action.replace('_', ' '),
      user: (activity.users as any)?.name,
      timestamp: new Date(activity.created_at).toLocaleDateString(),
    })) || [];

    // Calculate conversion and churn rates (placeholder)
    const conversionRate = 0.12;
    const churnRate = 0.05;

    const metrics = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalRevenue,
      monthlyRevenue,
      aiCosts,
      aiCostPerUser,
      conversionRate,
      churnRate,
      topFeatures,
      userTiers,
      recentActivity,
    };

    return NextResponse.json({ metrics, mockUsed: false }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Admin metrics error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

