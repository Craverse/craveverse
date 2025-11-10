import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createLogger, createTraceId, getTraceIdFromHeaders } from '@/lib/logger';
import { supabaseServer } from '@/lib/supabase-client';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('reward-metrics', traceId);

  try {
    if (isMockMode()) {
      return NextResponse.json(
        {
          mockUsed: true,
          totals: {
            inventoryItems: 8,
            themesUnlocked: 3,
            activePauses: 1,
          },
          purchaseBreakdown: [
            { type: 'consumable', purchases: 4, coinsSpent: 200 },
            { type: 'utility', purchases: 2, coinsSpent: 180 },
            { type: 'cosmetic', purchases: 2, coinsSpent: 150 },
          ],
          recentPurchases: [
            {
              id: 'mock',
              itemName: 'Pause Token (3 day)',
              itemType: 'consumable',
              quantity: 1,
              amountCoins: 120,
              purchasedAt: new Date().toISOString(),
            },
          ],
        },
        { headers: { 'x-trace-id': traceId } },
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser, error: adminError } = await supabaseServer
      .from('admin_users')
      .select('id, role')
      .eq('clerk_user_id', userId)
      .maybeSingle();

    if (adminError || !adminUser) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];

    const [{ count: inventoryCount }, { count: themeCount }, { count: activePauseCount }] =
      await Promise.all([
        supabaseServer.from('user_inventory').select('id', { head: true, count: 'exact' }),
        supabaseServer.from('user_themes').select('id', { head: true, count: 'exact' }),
        supabaseServer
          .from('streak_pauses')
          .select('id', { head: true, count: 'exact' })
          .eq('is_active', true)
          .gte('end_date', today),
      ]);

    const { data: purchasesData, error: purchasesError } = await supabaseServer
      .from('user_purchases')
      .select(
        `
          id,
          quantity,
          amount_coins,
          purchased_at,
          shop_items!inner ( name, type )
        `,
      )
      .order('purchased_at', { ascending: false })
      .limit(50);

    if (purchasesError) {
      logger.error('Failed to gather purchase metrics', { error: purchasesError.message });
      return NextResponse.json({ error: 'Failed to load reward metrics' }, { status: 500 });
    }

    const purchaseBreakdownMap: Record<string, { purchases: number; coinsSpent: number }> = {};
    (purchasesData ?? []).forEach((entry: any) => {
      const type = entry?.shop_items?.type ?? 'unknown';
      if (!purchaseBreakdownMap[type]) {
        purchaseBreakdownMap[type] = { purchases: 0, coinsSpent: 0 };
      }
      purchaseBreakdownMap[type].purchases += entry?.quantity ?? 0;
      purchaseBreakdownMap[type].coinsSpent += entry?.amount_coins ?? 0;
    });

    const recentPurchases =
      (purchasesData ?? []).slice(0, 10).map((entry: any) => ({
        id: entry.id,
        itemName: entry?.shop_items?.name ?? 'Unknown item',
        itemType: entry?.shop_items?.type ?? 'unknown',
        quantity: entry.quantity,
        amountCoins: entry.amount_coins,
        purchasedAt: entry.purchased_at,
      })) ?? [];

    return NextResponse.json(
      {
        mockUsed: false,
        totals: {
          inventoryItems: inventoryCount ?? 0,
          themesUnlocked: themeCount ?? 0,
          activePauses: activePauseCount ?? 0,
        },
        purchaseBreakdown: Object.entries(purchaseBreakdownMap).map(([type, stats]) => ({
          type,
          purchases: stats.purchases,
          coinsSpent: stats.coinsSpent,
        })),
        recentPurchases,
      },
      { headers: { 'x-trace-id': traceId } },
    );
  } catch (error) {
    logger.error('Unhandled reward metrics error', { error: error instanceof Error ? error.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


