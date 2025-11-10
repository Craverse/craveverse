import { NextResponse } from 'next/server';
import { createLogger, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { supabaseServer } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

type ShopItem = {
  id: string;
  name: string;
  type: 'consumable' | 'utility' | 'cosmetic';
  price_coins: number;
  description?: string;
  icon?: string;
  effects?: Record<string, any>;
  tier_required: 'free' | 'plus' | 'plus_trial' | 'ultra';
};

function getMockItems(): ShopItem[] {
  return [
    {
      id: 'mock-pause-1',
      name: 'Pause Token (1 day)',
      type: 'consumable',
      price_coins: 50,
      description: 'Pause your streak without penalty for 1 day',
      icon: '⏸️',
      effects: { pause_days: 1 },
      tier_required: 'free',
    },
    {
      id: 'mock-pause-3',
      name: 'Pause Token (3 days)',
      type: 'consumable',
      price_coins: 120,
      description: 'Pause your streak without penalty for 3 days',
      icon: '⏸️',
      effects: { pause_days: 3 },
      tier_required: 'free',
    },
    {
      id: 'mock-skip-1',
      name: 'Level Skip',
      type: 'utility',
      price_coins: 100,
      description: 'Skip a particularly hard level once',
      icon: '⏭️',
      effects: { level_skip: 1 },
      tier_required: 'plus',
    },
    {
      id: 'mock-theme-1',
      name: 'Cosmetic Theme',
      type: 'cosmetic',
      price_coins: 75,
      description: 'Unlock a premium theme for your dashboard',
      icon: '🎨',
      effects: { theme: 'premium' },
      tier_required: 'free',
    },
  ];
}

export async function GET() {
  const traceId = createTraceId();
  const logger = createLogger('shop-items', traceId);

  try {
    if (isMockMode()) {
      const items = getMockItems();
      return NextResponse.json(
        { items, mockUsed: true },
        { headers: { 'x-trace-id': traceId, 'Cache-Control': 'no-store' } }
      );
    }

    const { data, error } = await supabaseServer
      .from('shop_items')
      .select('id, name, type, price_coins, description, icon, effects, tier_required')
      .eq('active', true)
      .order('price_coins', { ascending: true });

    if (error) {
      logger.error('Failed to fetch shop items', { error: error.message });
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
    }

    return NextResponse.json(
      { items: (data || []) as ShopItem[], mockUsed: false },
      { headers: { 'x-trace-id': traceId, 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



