// API route for activating pause tokens
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger, getTraceIdFromHeaders, createTraceId } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const traceId = getTraceIdFromHeaders(request.headers) || createTraceId();
  const logger = createLogger('pause-token-activate', traceId);

  try {
    const { tokenId, days } = await request.json();
    
    if (!tokenId || !days || (days !== 1 && days !== 3)) {
      return NextResponse.json(
        { error: 'Invalid request. tokenId and days (1 or 3) required.' },
        { status: 400 }
      );
    }

    if (isMockMode()) {
      logger.info('Mock mode: simulating pause token activation');
      return NextResponse.json(
        {
          success: true,
          pausePeriod: {
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
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

    // Verify user has the token in inventory
    const { data: inventoryItem, error: inventoryError } = await supabaseServer
      .from('user_inventory')
      .select('id, quantity, item_id, shop_items!inner(effects)')
      .eq('id', tokenId)
      .eq('user_id', user.id)
      .single();

    if (inventoryError || !inventoryItem) {
      logger.warn('Token not found in inventory', { tokenId, error: inventoryError?.message });
      return NextResponse.json({ error: 'Token not found in inventory' }, { status: 404 });
    }

    // Verify this is a pause token with matching days
    const effects = (inventoryItem.shop_items as any)?.effects || {};
    const pauseDays = effects.pause_days;
    
    if (!pauseDays || pauseDays !== days) {
      return NextResponse.json(
        { error: `Token does not match requested days. This token provides ${pauseDays} day(s).` },
        { status: 400 }
      );
    }

    // Check if user already has an active pause period
    const today = new Date().toISOString().split('T')[0];
    const { data: activePause, error: activePauseError } = await supabaseServer
      .from('streak_pauses')
      .select('id, end_date')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .lte('start_date', today) // Pause has started
      .gte('end_date', today) // Pause hasn't ended
      .single();

    if (activePauseError && activePauseError.code !== 'PGRST116') {
      logger.error('Error checking active pauses', { error: activePauseError.message });
      return NextResponse.json({ error: 'Failed to check active pauses' }, { status: 500 });
    }

    if (activePause) {
      return NextResponse.json(
        { 
          error: 'You already have an active pause period',
          activeUntil: activePause.end_date
        },
        { status: 400 }
      );
    }

    // Calculate end date (using UTC to avoid timezone issues)
    const startDate = today;
    const endDateObj = new Date(today + 'T00:00:00Z');
    endDateObj.setUTCDate(endDateObj.getUTCDate() + days);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Create streak_pauses record
    const { data: pauseRecord, error: pauseError } = await supabaseServer
      .from('streak_pauses')
      .insert({
        user_id: user.id,
        pause_token_id: inventoryItem.id,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      .select('id, start_date, end_date')
      .single();

    if (pauseError) {
      logger.error('Failed to create pause record', { error: pauseError.message });
      return NextResponse.json({ error: 'Failed to activate pause token' }, { status: 500 });
    }

    // Decrement inventory quantity (or delete if quantity becomes 0)
    if (inventoryItem.quantity <= 1) {
      const { error: deleteError } = await supabaseServer
        .from('user_inventory')
        .delete()
        .eq('id', inventoryItem.id);
      
      if (deleteError) {
        logger.error('Failed to delete inventory item', { error: deleteError.message });
        // Don't fail the request, pause is already active
      }
    } else {
      const { error: updateError } = await supabaseServer
        .from('user_inventory')
        .update({ quantity: inventoryItem.quantity - 1 })
        .eq('id', inventoryItem.id);
      
      if (updateError) {
        logger.error('Failed to update inventory', { error: updateError.message });
        // Don't fail the request, pause is already active
      }
    }

    logger.info('Pause token activated', {
      userId: user.id,
      tokenId,
      days,
      pauseId: pauseRecord.id,
    });

    return NextResponse.json(
      {
        success: true,
        pausePeriod: {
          id: pauseRecord.id,
          startDate: pauseRecord.start_date,
          endDate: pauseRecord.end_date,
          days,
        },
        mockUsed: false,
      },
      { headers: { 'x-trace-id': traceId } }
    );
  } catch (err) {
    logger.error('Unhandled error', { error: err instanceof Error ? err.message : 'Unknown' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

