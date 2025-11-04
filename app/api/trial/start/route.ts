// API route for starting free trial
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('trial-start', traceId);

  try {
    if (isMockMode()) {
      const { planId } = await request.json();
      if (!planId || planId === 'free') {
        return NextResponse.json({ error: 'Invalid plan for trial' }, { status: 400 });
      }
      logger.info('Mock mode: returning mock trial start');
      return NextResponse.json({ success: true, message: 'Trial started successfully', trial_end: new Date(Date.now()+14*24*60*60*1000).toISOString(), plan_id: planId, mockUsed: true }, { headers: { 'x-trace-id': traceId } });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await request.json();

    if (!planId || planId === 'free') {
      return NextResponse.json(
        { error: 'Invalid plan for trial' },
        { status: 400 }
      );
    }

    const { data: userProfile, error: userError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userProfile) {
      logger.warn('User not found for trial start', { userId, error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has an active subscription or trial
    const { data: existingSubscription, error: subError } = await supabaseServer
      .from('subscriptions')
      .select('status, plan_id, trial_end')
      .eq('user_id', userProfile.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError && subError.code !== 'PGRST116') {
      logger.error('Error checking existing subscription', { error: subError.message });
      return NextResponse.json(
        { error: 'Failed to check subscription status' },
        { status: 500 }
      );
    }

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription or trial' },
        { status: 400 }
      );
    }

    // Check if user has used trial before
    const { data: trialHistory, error: trialError } = await supabaseServer
      .from('trial_history')
      .select('id')
      .eq('user_id', userProfile.id)
      .eq('plan_id', planId)
      .single();

    if (trialError && trialError.code !== 'PGRST116') {
      logger.error('Error checking trial history', { error: trialError.message });
      return NextResponse.json(
        { error: 'Failed to check trial history' },
        { status: 500 }
      );
    }

    if (trialHistory) {
      return NextResponse.json(
        { error: 'Trial already used for this plan' },
        { status: 400 }
      );
    }

    // Start trial
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    // Create trial subscription
    const { data: subscription, error: createError } = await supabaseServer
      .from('subscriptions')
      .insert({
        user_id: userProfile.id,
        plan_id: planId,
        status: 'trialing',
        trial_start: trialStart.toISOString(),
        trial_end: trialEnd.toISOString(),
        current_period_start: trialStart.toISOString(),
        current_period_end: trialEnd.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating trial subscription', { error: createError.message });
      return NextResponse.json(
        { error: 'Failed to start trial' },
        { status: 500 }
      );
    }

    // Update user's plan
    const { error: updateUserError } = await supabaseServer
      .from('users')
      .update({
        plan_id: planId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProfile.id);

    if (updateUserError) {
      logger.error('Error updating user plan', { error: updateUserError.message });
      return NextResponse.json(
        { error: 'Failed to update user plan' },
        { status: 500 }
      );
    }

    // Record trial history
    const { error: trialHistoryError } = await supabaseServer
      .from('trial_history')
      .insert({
        user_id: userProfile.id,
        plan_id: planId,
        started_at: trialStart.toISOString(),
        ended_at: trialEnd.toISOString(),
      });

    if (trialHistoryError) {
      logger.warn('Error recording trial history', { error: trialHistoryError.message });
      // Don't fail the request for this
    }

    // Log activity
    try {
      await supabaseServer
        .from('activity_log')
        .insert({
          user_id: userProfile.id,
          action: 'trial_started',
          resource_type: 'subscription',
          resource_id: subscription.id,
          metadata: {
            plan_id: planId,
            trial_end: trialEnd.toISOString(),
          },
        });
    } catch (logError) {
      logger.warn('Error logging activity', { error: logError });
    }

    return NextResponse.json({
      success: true,
      message: 'Trial started successfully',
      trial_end: trialEnd.toISOString(),
      plan_id: planId,
      mockUsed: false,
    }, { headers: { 'x-trace-id': traceId } });
  } catch (error) {
    logger.error('Start trial error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


