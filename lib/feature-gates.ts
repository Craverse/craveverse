// Feature gating system for subscription tiers
// Feature gates configuration

export interface FeatureGate {
  name: string;
  description: string;
  requiredTier: string;
  isEnabled: (userTier: string) => boolean;
  getUpgradeMessage: (userTier: string) => string;
}

export const FEATURE_GATES: Record<string, FeatureGate> = {
  // Level System
  UNLIMITED_LEVELS: {
    name: 'Unlimited Levels',
    description: 'Access to all 30 levels in your journey',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus to unlock all 30 levels'
        : 'Feature already available',
  },

  // Multiple Cravings
  MULTIPLE_CRAVINGS: {
    name: 'Multiple Cravings',
    description: 'Work on multiple cravings simultaneously',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus to work on multiple cravings'
        : 'Feature already available',
  },

  // Forum Features
  UNLIMITED_FORUM_POSTS: {
    name: 'Unlimited Forum Posts',
    description: 'Post unlimited threads and replies in the community',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for unlimited forum posts'
        : 'Feature already available',
  },

  // Battle System
  BATTLE_SYSTEM: {
    name: '1v1 Battles',
    description: 'Challenge others in competitive battles',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus to unlock 1v1 battles'
        : 'Feature already available',
  },

  UNLIMITED_BATTLES: {
    name: 'Unlimited Battles',
    description: 'Start unlimited battles per day',
    requiredTier: 'ultra',
    isEnabled: (userTier: string) => userTier === 'ultra',
    getUpgradeMessage: (userTier: string) => 
      userTier !== 'ultra' 
        ? 'Upgrade to Ultra for unlimited battles'
        : 'Feature already available',
  },

  // AI Features
  AI_WEEKLY_INSIGHTS: {
    name: 'Weekly AI Insights',
    description: 'Get personalized weekly progress summaries',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for weekly AI insights'
        : 'Feature already available',
  },

  PERSONAL_AI_COACH: {
    name: 'Personal AI Coach',
    description: 'Get personalized coaching and advice',
    requiredTier: 'ultra',
    isEnabled: (userTier: string) => userTier === 'ultra',
    getUpgradeMessage: (userTier: string) => 
      userTier !== 'ultra' 
        ? 'Upgrade to Ultra for personal AI coaching'
        : 'Feature already available',
  },

  // Recovery Features
  STREAK_RECOVERY: {
    name: 'Streak Recovery',
    description: 'Recover from broken streaks without losing progress',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for streak recovery'
        : 'Feature already available',
  },

  PAUSE_TOKENS: {
    name: 'Pause Tokens',
    description: 'Pause your journey when needed',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for pause tokens'
        : 'Feature already available',
  },

  // Rewards
  REAL_WORLD_REWARDS: {
    name: 'Real-World Rewards',
    description: 'Earn actual rewards for completing challenges',
    requiredTier: 'ultra',
    isEnabled: (userTier: string) => userTier === 'ultra',
    getUpgradeMessage: (userTier: string) => 
      userTier !== 'ultra' 
        ? 'Upgrade to Ultra for real-world rewards'
        : 'Feature already available',
  },

  // Analytics
  ADVANCED_ANALYTICS: {
    name: 'Advanced Analytics',
    description: 'Detailed insights into your progress',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for advanced analytics'
        : 'Feature already available',
  },

  // Support
  PRIORITY_SUPPORT: {
    name: 'Priority Support',
    description: 'Get faster response times for support',
    requiredTier: 'plus',
    isEnabled: (userTier: string) => userTier !== 'free',
    getUpgradeMessage: (userTier: string) => 
      userTier === 'free' 
        ? 'Upgrade to Plus for priority support'
        : 'Feature already available',
  },
};

export function checkFeatureAccess(featureName: string, userTier: string): boolean {
  const feature = FEATURE_GATES[featureName];
  if (!feature) {
    console.warn(`Unknown feature: ${featureName}`);
    return false;
  }
  return feature.isEnabled(userTier);
}

export function getFeatureUpgradeMessage(featureName: string, userTier: string): string {
  const feature = FEATURE_GATES[featureName];
  if (!feature) {
    return 'Feature not found';
  }
  return feature.getUpgradeMessage(userTier);
}

export function getRequiredTier(featureName: string): string {
  const feature = FEATURE_GATES[featureName];
  if (!feature) {
    return 'unknown';
  }
  return feature.requiredTier;
}

export function getFeaturesForTier(tier: string): string[] {
  return Object.keys(FEATURE_GATES).filter(featureName => 
    FEATURE_GATES[featureName].isEnabled(tier)
  );
}

export function getUpgradeFeatures(currentTier: string): string[] {
  return Object.keys(FEATURE_GATES).filter(featureName => 
    !FEATURE_GATES[featureName].isEnabled(currentTier)
  );
}


