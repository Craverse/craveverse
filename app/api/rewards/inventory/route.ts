// API route for fetching user inventory
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('inventory', traceId);

  try {
    if (isMockMode()) {
      logger.info('Mock mode: returning mock inventory');
      return NextResponse.json(
        {
          inventory: [
            {
              id: 'mock-inv-1',
              itemId: 'mock-pause-1',
              itemName: 'Pause Token (1 day)',
              itemType: 'consumable',
              quantity: 2,
              effects: { pause_days: 1 },
            },
            {
              id: 'mock-inv-2',
              itemId: 'mock-skip-1',
              itemName: 'Level Skip',
              itemType: 'utility',
              quantity: 1,
              effects: { level_skip: 1 },
            },
          ],
          mockUsed: true,
        },
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
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user inventory with shop item details
    const { data: inventory, error: inventoryError } = await supabaseServer
      .from('user_inventory')
      .select(`
        id,
        item_id,
        quantity,
        purchased_at,
        expires_at,
        shop_items (
          name,
          type,
          effects,
          icon
        )
      `)
      .eq('user_id', user.id)
      .gt('quantity', 0);

    if (inventoryError) {
      logger.error('Failed to fetch inventory', { error: inventoryError.message });
      return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }

    // Format inventory items
    const formattedInventory = (inventory || []).map((item: any) => ({
      id: item.id,
      itemId: item.item_id,
      itemName: item.shop_items?.name || 'Unknown Item',
      itemType: item.shop_items?.type || 'unknown',
      quantity: item.quantity,
      effects: item.shop_items?.effects || {},
      icon: item.shop_items?.icon || '🛒',
      purchasedAt: item.purchased_at,
      expiresAt: item.expires_at,
    }));

    logger.info('Inventory fetched', { userId: user.id, itemCount: formattedInventory.length });

    return NextResponse.json(
      {
        inventory: formattedInventory,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

