import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('shop-purchases', traceId);

  try {
    if (isMockMode()) {
      return NextResponse.json(
        {
          purchases: [
            {
              id: 'mock-purchase-1',
              itemName: 'Pause Token (1 day)',
              itemType: 'consumable',
              quantity: 1,
              amountCoins: 50,
              purchasedAt: new Date().toISOString(),
            },
          ],
          mockUsed: true,
        },
        { headers: { 'x-trace-id': traceId } },
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data, error } = await supabaseServer
      .from('user_purchases')
      .select(
        `
          id,
          quantity,
          amount_coins,
          purchased_at,
          shop_items!inner (
            name,
            type
          )
        `,
      )
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false })
      .limit(30);

    if (error) {
      logger.error('Failed to fetch purchases', { error: error.message });
      return NextResponse.json({ error: 'Failed to load purchases' }, { status: 500 });
    }

    const purchases =
      data?.map((entry: any) => ({
        id: entry.id,
        itemName: entry?.shop_items?.name ?? 'Unknown item',
        itemType: entry?.shop_items?.type ?? 'unknown',
        quantity: entry.quantity,
        amountCoins: entry.amount_coins,
        purchasedAt: entry.purchased_at,
      })) ?? [];

    return NextResponse.json(
      {
        purchases,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } },
    );
  } catch (error) {
    logger.error('Unhandled error', { error: error instanceof Error ? error.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


