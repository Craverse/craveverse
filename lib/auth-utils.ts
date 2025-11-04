// Authentication utilities for Clerk integration
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase-client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('auth-utils');

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string;
  avatar_url: string;
  primary_craving: string | null;
  current_level: number;
  xp: number;
  cravecoins: number;
  streak_count: number;
  subscription_tier: 'free' | 'plus' | 'plus_trial' | 'ultra';
  plan_id: string | null;
  trial_ends_at: string | null;
  ai_summary: string | null;
  preferences: any;
  created_at: string;
  updated_at: string;
}

// Get current user profile from database
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      logger.debug('No userId from auth');
      return null;
    }

    logger.info('Looking for user profile', { clerk_user_id: userId });

    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile', { error: error.message, clerk_user_id: userId });
      return null;
    }

    logger.debug('User profile found', { clerk_user_id: userId, primary_craving: data.primary_craving });
    return data;
  } catch (error) {
    logger.error('Exception in getCurrentUserProfile', { error: error instanceof Error ? error.message : 'Unknown error' });
    return null;
  }
}

// Get user profile by ID
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    logger.debug('Fetching user profile by ID', { user_id: userId });

    const { data, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile by ID', { error: error.message, user_id: userId });
      return null;
    }

    logger.debug('User profile found by ID', { user_id: userId, primary_craving: data.primary_craving });
    return data;
  } catch (error) {
    logger.error('Exception in getUserProfile', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    logger.info('Updating user profile', { user_id: userId, updates });

    // Check if we're in mock mode
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co' ||
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key' ||
                       process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-key';
    
    if (isMockMode) {
      logger.info('Mock mode: Simulating user profile update', { user_id: userId, updates });
      // In mock mode, just return success
      return true;
    }

    const { error } = await supabaseServer
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      logger.error('Error updating user profile', { error: error.message, user_id: userId, updates });
      return false;
    }

    logger.info('User profile updated successfully', { user_id: userId });
    return true;
  } catch (error) {
    logger.error('Exception in updateUserProfile', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return false;
  }
}

// Check if user has completed onboarding by clerk_user_id
export async function hasCompletedOnboarding(clerkUserId: string): Promise<boolean> {
  try {
    logger.debug('Checking onboarding status', { clerk_user_id: clerkUserId });

    // Check if we're in mock mode
    const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co' ||
                       process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co' ||
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key' ||
                       process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-key';
    
    if (isMockMode) {
      logger.debug('Mock mode: Returning false for onboarding check');
      return false;
    }

    const { data, error } = await supabaseServer
      .from('users')
      .select('primary_craving')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error) {
      // User doesn't exist yet or error - consider onboarding incomplete
      if (error.code === 'PGRST116') {
        logger.debug('User not found in database - onboarding incomplete', { clerk_user_id: clerkUserId });
        return false;
      }
      logger.error('Error checking onboarding status', { error: error.message, clerk_user_id: clerkUserId });
      return false;
    }

    const isComplete = data.primary_craving !== null && data.primary_craving !== undefined;
    logger.debug('Onboarding status checked', { clerk_user_id: clerkUserId, isComplete, primary_craving: data.primary_craving });
    return isComplete;
  } catch (error) {
    logger.error('Exception in hasCompletedOnboarding', { error: error instanceof Error ? error.message : 'Unknown error', clerk_user_id: clerkUserId });
    return false;
  }
}

// Get user's subscription tier
export async function getUserSubscriptionTier(userId: string): Promise<'free' | 'plus' | 'plus_trial' | 'ultra'> {
  try {
    logger.debug('Fetching subscription tier', { user_id: userId });

    const { data, error } = await supabaseServer
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching subscription tier', { error: error.message, user_id: userId });
      return 'free';
    }

    logger.debug('Subscription tier fetched', { user_id: userId, tier: data.subscription_tier });
    return data.subscription_tier;
  } catch (error) {
    logger.error('Exception in getUserSubscriptionTier', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return 'free';
  }
}

// Check if user can access feature
export async function canAccessFeature(
  userId: string,
  feature: string
): Promise<boolean> {
  try {
    const tier = await getUserSubscriptionTier(userId);
    
    // Check feature access based on tier
    switch (feature) {
      case 'battles':
        return tier === 'plus' || tier === 'plus_trial' || tier === 'ultra';
      case 'all_levels':
        return tier === 'plus' || tier === 'plus_trial' || tier === 'ultra';
      case 'multiple_cravings':
        return tier === 'ultra';
      case 'ai_coaching':
        return tier === 'ultra';
      default:
        return true;
    }
  } catch (error) {
    console.error('Error in canAccessFeature:', error);
    return false;
  }
}

// Get user's remaining AI calls for today
export async function getRemainingAICalls(userId: string): Promise<number> {
  try {
    const tier = await getUserSubscriptionTier(userId);
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    logger.debug('Fetching AI usage', { user_id: userId, tier, today });
    
    // Get current usage from cache or database
    const { data, error } = await supabaseServer
      .from('ai_usage_metrics')
      .select('tokens_used')
      .eq('user_id', userId)
      .gte('created_at', today);

    if (error) {
      logger.error('Error fetching AI usage', { error: error.message, user_id: userId });
      return 0;
    }

    // FIXED: Added type annotation for sum parameter
    const totalTokens = data.reduce((sum: number, record: any) => sum + record.tokens_used, 0);
    
    // Calculate remaining calls based on tier
    const limits = {
      free: 10,
      plus: 50,
      plus_trial: 50,
      ultra: 999,
    };

    const limit = limits[tier];
    const estimatedCallsUsed = Math.floor(totalTokens / 100); // Rough estimation
    const remaining = Math.max(0, limit - estimatedCallsUsed);
    
    logger.debug('AI calls calculated', { user_id: userId, totalTokens, limit, estimatedCallsUsed, remaining });
    return remaining;
  } catch (error) {
    logger.error('Exception in getRemainingAICalls', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return 0;
  }
}

// Check if user is in trial period
export async function isInTrialPeriod(userId: string): Promise<boolean> {
  try {
    logger.debug('Checking trial status', { user_id: userId });

    const { data, error } = await supabaseServer
      .from('users')
      .select('subscription_tier, trial_ends_at')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error checking trial status', { error: error.message, user_id: userId });
      return false;
    }

    if (data.subscription_tier !== 'plus_trial') {
      logger.debug('User not in trial tier', { user_id: userId, tier: data.subscription_tier });
      return false;
    }

    if (!data.trial_ends_at) {
      logger.debug('No trial end date', { user_id: userId });
      return false;
    }

    const trialEndsAt = new Date(data.trial_ends_at);
    const now = new Date();
    const isInTrial = now < trialEndsAt;

    logger.debug('Trial status checked', { user_id: userId, trial_ends_at: data.trial_ends_at, isInTrial });
    return isInTrial;
  } catch (error) {
    logger.error('Exception in isInTrialPeriod', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return false;
  }
}

// Get user's progress statistics
export async function getUserProgressStats(userId: string): Promise<{
  totalLevelsCompleted: number;
  currentStreak: number;
  totalXP: number;
  totalCoins: number;
  currentLevel: number;
}> {
  try {
    logger.debug('Fetching progress stats', { user_id: userId });

    const { data, error } = await supabaseServer
      .from('users')
      .select('current_level, xp, cravecoins, streak_count')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching progress stats', { error: error.message, user_id: userId });
      return {
        totalLevelsCompleted: 0,
        currentStreak: 0,
        totalXP: 0,
        totalCoins: 0,
        currentLevel: 1,
      };
    }

    // Get completed levels count
    const { count: completedLevels } = await supabaseServer
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('completed_at', 'is', null);

    const stats = {
      totalLevelsCompleted: completedLevels || 0,
      currentStreak: data.streak_count,
      totalXP: data.xp,
      totalCoins: data.cravecoins,
      currentLevel: data.current_level,
    };

    logger.debug('Progress stats fetched', { user_id: userId, stats });
    return stats;
  } catch (error) {
    logger.error('Exception in getUserProgressStats', { error: error instanceof Error ? error.message : 'Unknown error', user_id: userId });
    return {
      totalLevelsCompleted: 0,
      currentStreak: 0,
      totalXP: 0,
      totalCoins: 0,
      currentLevel: 1,
    };
  }
}

// Create user context for API routes
export async function createUserContext(): Promise<{
  user: UserProfile | null;
  isAuthenticated: boolean;
  canAccess: (feature: string) => Promise<boolean>;
  remainingAICalls: number;
  progressStats: any;
}> {
  const user = await getCurrentUserProfile();
  const isAuthenticated = !!user;

  return {
    user,
    isAuthenticated,
    canAccess: (feature: string) => 
      user ? canAccessFeature(user.id, feature) : Promise.resolve(false),
    remainingAICalls: user ? await getRemainingAICalls(user.id) : 0,
    progressStats: user ? await getUserProgressStats(user.id) : null,
  };
}