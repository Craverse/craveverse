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

    // Apply effects based on item type
    const effects = item.effects || {};
    const hasPauseDays = 'pause_days' in effects;
    const hasLevelSkip = 'level_skip' in effects;
    const hasTheme = 'theme' in effects;
    const inventoryItemIds: string[] = [];

    // Check shop item type to determine if it's consumable/utility or cosmetic
    const { data: shopItem } = await supabaseServer
      .from('shop_items')
      .select('type')
      .eq('id', item.id)
      .single();
    
    const isConsumableOrUtility = shopItem?.type === 'consumable' || shopItem?.type === 'utility';
    const isCosmetic = shopItem?.type === 'cosmetic';

    if (isConsumableOrUtility && (hasPauseDays || hasLevelSkip)) {
      // For consumables/utilities: Add to user_inventory (don't activate yet)
      const { data: existingInventory, error: inventoryCheckError } = await supabaseServer
        .from('user_inventory')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('item_id', item.id)
        .single();

      if (inventoryCheckError && inventoryCheckError.code !== 'PGRST116') {
        logger.warn('Error checking inventory', { error: inventoryCheckError.message });
      }

      if (existingInventory) {
        // Update existing inventory entry
        const { data: updatedInventory, error: updateInventoryError } = await supabaseServer
          .from('user_inventory')
          .update({ quantity: existingInventory.quantity + quantity })
          .eq('id', existingInventory.id)
          .select('id')
          .single();
        
        if (updateInventoryError) {
          logger.error('Failed to update inventory', { error: updateInventoryError.message });
        } else if (updatedInventory) {
          inventoryItemIds.push(updatedInventory.id);
        }
      } else {
        // Create new inventory entry
        const { data: newInventory, error: insertInventoryError } = await supabaseServer
          .from('user_inventory')
          .insert({ 
            user_id: user.id, 
            item_id: item.id, 
            quantity 
          })
          .select('id')
          .single();
        
        if (insertInventoryError) {
          logger.error('Failed to add to inventory', { error: insertInventoryError.message });
        } else if (newInventory) {
          inventoryItemIds.push(newInventory.id);
        }
      }
    } else if (isCosmetic && hasTheme) {
      // For cosmetic themes: Unlock immediately in user_themes with personalization
      const themeId = item.effects?.theme || 'premium';
      
      // Fetch user profile for personalization
      const { data: userProfile, error: profileError } = await supabaseServer
        .from('users')
        .select('primary_craving, current_level, streak_count, xp, preferences')
        .eq('id', user.id)
        .single();
      
      let themeData = {};
      if (!profileError && userProfile) {
        // Import personalization function (dynamic import to avoid circular deps)
        try {
          const { generateThemePersonalization } = await import('@/lib/theme-personalization');
          themeData = generateThemePersonalization({
            primary_craving: userProfile.primary_craving,
            current_level: userProfile.current_level,
            streak_count: userProfile.streak_count,
            xp: userProfile.xp,
            preferences: userProfile.preferences || {},
          }, themeId);
        } catch (importError) {
          logger.warn('Failed to generate theme personalization', { error: importError instanceof Error ? importError.message : 'Unknown' });
        }
      }
      
      const { data: newTheme, error: themeError } = await supabaseServer
        .from('user_themes')
        .insert({ 
          user_id: user.id, 
          theme_id: themeId,
          theme_data: themeData
        })
        .select('id')
        .single();
      
      if (themeError) {
        // If theme already exists, that's fine (idempotent)
        if (themeError.code !== '23505') { // Not a unique constraint violation
          logger.error('Failed to unlock theme', { error: themeError.message });
        }
      } else if (newTheme) {
        inventoryItemIds.push(newTheme.id);
      }
    }

    logger.info('Purchase completed', { 
      userId: user.id, 
      itemId: item.id, 
      quantity, 
      inventoryItemIds 
    });

    return NextResponse.json(
      { 
        success: true, 
        newBalance: user.cravecoins - totalCost, 
        mockUsed: false,
        inventoryItemIds 
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



