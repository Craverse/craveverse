// Utility functions for streak management with pause token support
import { supabaseServer } from './supabase-client';
import { createLogger } from './logger';

const logger = createLogger('streak-utils');

/**
 * Check if user has an active pause period that prevents streak loss
 * @param userId - User's UUID (not Clerk ID)
 * @returns True if user is in an active pause period
 */
export async function isUserInPausePeriod(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: activePause, error } = await supabaseServer
      .from('streak_pauses')
      .select('id, start_date, end_date')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('start_date', today) // Pause has started
      .gte('end_date', today) // Pause hasn't ended
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking pause period', { userId, error: error.message });
      return false; // Fail open - don't block if check fails
    }

    return !!activePause;
  } catch (error) {
    logger.error('Exception in isUserInPausePeriod', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    return false; // Fail open
  }
}

/**
 * Check if user should lose streak (returns false if in pause period)
 * @param userId - User's UUID (not Clerk ID)
 * @returns True if streak should be lost, false if protected by pause
 */
export async function shouldLoseStreak(userId: string): Promise<boolean> {
  const isPaused = await isUserInPausePeriod(userId);
  return !isPaused; // Only lose streak if NOT paused
}

/**
 * Update user streak with pause period protection
 * @param userId - User's UUID (not Clerk ID)
 * @param increment - If true, increment streak; if false, check pause before resetting
 * @returns Updated streak count
 */
export async function updateStreakWithPause(userId: string, increment: boolean = true): Promise<number> {
  try {
    if (increment) {
      // Always allow incrementing (completing levels)
      const { error } = await supabaseServer.rpc('update_streak', {
        user_id_param: userId,
        increment: true,
      });

      if (error) {
        logger.error('Error incrementing streak', { userId, error: error.message });
        return 0;
      }

      // Fetch updated streak
      const { data: user } = await supabaseServer
        .from('users')
        .select('streak_count')
        .eq('id', userId)
        .single();

      return user?.streak_count || 0;
    } else {
      // Check pause before resetting
      const isPaused = await isUserInPausePeriod(userId);
      
      if (isPaused) {
        logger.info('Streak protected by pause period', { userId });
        // Fetch current streak (don't reset)
        const { data: user } = await supabaseServer
          .from('users')
          .select('streak_count')
          .eq('id', userId)
          .single();
        
        return user?.streak_count || 0;
      }

      // Reset streak (not paused)
      const { error } = await supabaseServer.rpc('update_streak', {
        user_id_param: userId,
        increment: false,
      });

      if (error) {
        logger.error('Error resetting streak', { userId, error: error.message });
        return 0;
      }

      return 0; // Streak was reset
    }
  } catch (error) {
    logger.error('Exception in updateStreakWithPause', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return 0;
  }
}

/**
 * Get active pause period for user (if any)
 * @param userId - User's UUID (not Clerk ID)
 * @returns Active pause period or null
 */
export async function getActivePausePeriod(userId: string): Promise<{
  id: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
} | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: activePause, error } = await supabaseServer
      .from('streak_pauses')
      .select('id, start_date, end_date')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('start_date', today) // Pause has started
      .gte('end_date', today) // Pause hasn't ended
      .single();

    if (error || !activePause) {
      return null;
    }

    const endDate = new Date(activePause.end_date);
    const todayDate = new Date(today);
    const daysRemaining = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: activePause.id,
      startDate: activePause.start_date,
      endDate: activePause.end_date,
      daysRemaining: Math.max(0, daysRemaining),
    };
  } catch (error) {
    logger.error('Exception in getActivePausePeriod', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    return null;
  }
}

