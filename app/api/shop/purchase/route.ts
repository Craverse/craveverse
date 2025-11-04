import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('shop-purchase', traceId);

  try {
    const { itemId, quantity = 1 } = await request.json();
    if (!itemId || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (isMockMode()) {
      // Simulate purchase by deducting coins locally (client should refresh profile)
      return NextResponse.json(
        { success: true, newBalance: 240, mockUsed: true },
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
      .select('id, cravecoins, subscription_tier')
      .eq('clerk_user_id', userId)
      .single();
    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch item
    const { data: item, error: itemError } = await supabaseServer
      .from('shop_items')
      .select('id, name, price_coins, tier_required, effects')
      .eq('id', itemId)
      .eq('active', true)
      .single();
    if (itemError || !item) {
      logger.warn('Item not found or inactive');
      return NextResponse.json({ error: 'Item not available' }, { status: 404 });
    }

    // Check tier
    const allowedTiers = ['free', 'plus', 'plus_trial', 'ultra'];
    if (
      allowedTiers.indexOf(user.subscription_tier) <
      allowedTiers.indexOf(item.tier_required)
    ) {
      return NextResponse.json({ error: 'Insufficient tier' }, { status: 403 });
    }

    const totalCost = item.price_coins * quantity;
    if (user.cravecoins < totalCost) {
      return NextResponse.json({ error: 'Insufficient coins' }, { status: 402 });
    }

    // Deduct coins and create purchase (best-effort transactional sequence)
    const { error: updateError } = await supabaseServer
      .from('users')
      .update({ cravecoins: user.cravecoins - totalCost })
      .eq('id', user.id);
    if (updateError) {
      logger.error('Failed to deduct coins', { error: updateError.message });
      return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
    }

    const { error: purchaseError } = await supabaseServer
      .from('user_purchases')
      .insert({ user_id: user.id, item_id: item.id, quantity, amount_coins: totalCost });
    if (purchaseError) {
      logger.error('Failed to insert purchase', { error: purchaseError.message });
      return NextResponse.json({ error: 'Purchase recorded with issues' }, { status: 500 });
    }

    // TODO: Apply effects (pause tokens, level skip) via follow-up job if needed

    return NextResponse.json(
      { success: true, newBalance: user.cravecoins - totalCost, mockUsed: false },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



