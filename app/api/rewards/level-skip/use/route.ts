// API route for using level skip
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('level-skip-use', traceId);

  try {
    const { levelId } = await request.json();

    if (!levelId) {
      return NextResponse.json({ error: 'levelId is required' }, { status: 400 });
    }

    if (isMockMode()) {
      logger.info('Mock mode: simulating level skip');
      return NextResponse.json(
        {
          success: true,
          levelCompleted: true,
          newLevel: 2,
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
      .select('id, current_level, primary_craving')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !user) {
      logger.error('User not found', { error: userError?.message });
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify user has level skip in inventory
    const { data: skipInventory, error: skipError } = await supabaseServer
      .from('user_inventory')
      .select(`
        id,
        quantity,
        item_id,
        shop_items!inner(effects, type)
      `)
      .eq('user_id', user.id)
      .gt('quantity', 0)
      .limit(1);

    if (skipError || !skipInventory || skipInventory.length === 0) {
      logger.warn('No level skip found in inventory', { error: skipError?.message });
      return NextResponse.json(
        { error: 'No level skip available in inventory' },
        { status: 404 }
      );
    }

    // Find a level skip item
    const skipItem = skipInventory.find((item: any) => {
      const effects = item.shop_items?.effects || {};
      return 'level_skip' in effects && item.shop_items?.type === 'utility';
    });

    if (!skipItem) {
      return NextResponse.json(
        { error: 'No level skip available in inventory' },
        { status: 404 }
      );
    }

    // Verify level exists and get level details
    const { data: level, error: levelError } = await supabaseServer
      .from('levels')
      .select('id, level_number, craving_type')
      .eq('id', levelId)
      .single();

    if (levelError || !level) {
      logger.warn('Level not found', { levelId, error: levelError?.message });
      return NextResponse.json({ error: 'Level not found' }, { status: 404 });
    }

    // Check if level is already completed
    const { data: existingProgress, error: progressError } = await supabaseServer
      .from('user_progress')
      .select('id, completed_at')
      .eq('user_id', user.id)
      .eq('level_id', levelId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      logger.error('Error checking progress', { error: progressError.message });
      return NextResponse.json({ error: 'Failed to check progress' }, { status: 500 });
    }

    if (existingProgress?.completed_at) {
      return NextResponse.json(
        { error: 'Level already completed' },
        { status: 400 }
      );
    }

    // Mark level as completed (with 0 XP/coins)
    const { error: insertProgressError } = await supabaseServer
      .from('user_progress')
      .insert({
        user_id: user.id,
        level_id: levelId,
        completed_at: new Date().toISOString(),
        ai_feedback: 'Level skipped using level skip token.',
        user_response: 'Skipped',
        metadata: {
          skipped: true,
          skip_purchase_id: skipItem.item_id,
        },
      });

    if (insertProgressError) {
      logger.error('Failed to mark level as completed', { error: insertProgressError.message });
      return NextResponse.json({ error: 'Failed to skip level' }, { status: 500 });
    }

    // Advance user to next level
    const nextLevel = level.level_number + 1;
    const { error: updateLevelError } = await supabaseServer
      .from('users')
      .update({ current_level: nextLevel })
      .eq('id', user.id);

    if (updateLevelError) {
      logger.error('Failed to advance level', { error: updateLevelError.message });
      // Don't fail the request, level is already marked as completed
    }

    // Decrement inventory quantity (or delete if quantity becomes 0)
    if (skipItem.quantity <= 1) {
      const { error: deleteError } = await supabaseServer
        .from('user_inventory')
        .delete()
        .eq('id', skipItem.id);

      if (deleteError) {
        logger.error('Failed to delete inventory item', { error: deleteError.message });
        // Don't fail the request
      }
    } else {
      const { error: updateError } = await supabaseServer
        .from('user_inventory')
        .update({ quantity: skipItem.quantity - 1 })
        .eq('id', skipItem.id);

      if (updateError) {
        logger.error('Failed to update inventory', { error: updateError.message });
        // Don't fail the request
      }
    }

    logger.info('Level skipped', {
      userId: user.id,
      levelId,
      levelNumber: level.level_number,
      newLevel: nextLevel,
      skipInventoryId: skipItem.id,
    });

    return NextResponse.json(
      {
        success: true,
        levelCompleted: true,
        levelNumber: level.level_number,
        newLevel: nextLevel,
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

