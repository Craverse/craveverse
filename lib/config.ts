// CraveVerse Configuration
// Centralized config with typed constants for tier limits, AI quotas, rate limits

export const CONFIG = {
  // AI Configuration
  AI: {
    MODELS: {
      NANO: 'gpt-5-nano',
      MINI: 'gpt-5-mini',
    },
    BUDGETS: {
      MONTHLY_PER_USER: 0.01, // $0.01
      SOFT_LIMIT_THRESHOLD: 0.008, // $0.008 (80% of budget)
      FREE_TIER_MAX: 0.005, // $0.005 for free users
    },
    RATE_LIMITS: {
      FREE: {
        CALLS_PER_DAY: 10,
        TOKENS_PER_DAY: 25000, // 25k tokens/user/day for GPT-5-mini (strict limit)
        FORUM_SUGGESTIONS_PER_WEEK: 1,
      },
      PLUS: {
        CALLS_PER_DAY: 50,
        TOKENS_PER_DAY: 25000, // 25k tokens/user/day for GPT-5-mini (strict limit)
        FORUM_SUGGESTIONS_PER_DAY: 1,
      },
      ULTRA: {
        CALLS_PER_DAY: 999,
        TOKENS_PER_DAY: 25000, // 25k tokens/user/day for GPT-5-mini (strict limit)
        FORUM_SUGGESTIONS_PER_DAY: 5,
      },
    },
    CACHE_TTL: {
      NANO_RESPONSES: 24 * 60 * 60, // 24 hours
      MINI_RESPONSES: 7 * 24 * 60 * 60, // 7 days
      FORUM_TEMPLATES: 30 * 24 * 60 * 60, // 30 days
      USER_SUMMARIES: 7 * 24 * 60 * 60, // 7 days
    },
  },

  // Subscription Tiers
  TIERS: {
    FREE: {
      LEVELS_UNLOCKED: 10,
      CRAVINGS_COUNT: 1,
      BATTLES_ENABLED: false,
      PAUSE_TOKENS_PER_MONTH: 0,
      FORUM_POSTS_PER_DAY: 1,
    },
    PLUS: {
      LEVELS_UNLOCKED: 30,
      CRAVINGS_COUNT: 2,
      BATTLES_ENABLED: true,
      PAUSE_TOKENS_PER_MONTH: 3,
      FORUM_POSTS_PER_DAY: 999,
    },
    ULTRA: {
      LEVELS_UNLOCKED: 30,
      CRAVINGS_COUNT: 5,
      BATTLES_ENABLED: true,
      PAUSE_TOKENS_PER_MONTH: 10,
      FORUM_POSTS_PER_DAY: 999,
    },
  },

  // Pricing
  PRICING: {
    PLUS: {
      MONTHLY: 11.99,
      YEARLY: 59.99,
    },
    ULTRA: {
      MONTHLY: 29.99,
      YEARLY: 199.99,
    },
    COINS: {
      SMALL: { amount: 500, price: 2.99 },
      MEDIUM: { amount: 2000, price: 7.99 },
      LARGE: { amount: 5000, price: 14.99 },
    },
  },

  // Pricing Tiers for UI
  PRICING_TIERS: {
    free: {
      id: 'free',
      name: 'Free',
      price_monthly_usd: 0,
      price_yearly_usd: 0,
      levels_unlocked: 10,
      cravings_unlocked: 1,
      forum_post_limit_per_day: 1,
      pause_tokens_per_month: 0,
      streak_recovery: false,
      ai_weekly_insight_summaries: false,
      dynamic_ai_coach: false,
      real_world_reward: false,
    },
    plus: {
      id: 'plus',
      name: 'Plus',
      price_monthly_usd: 11.99,
      price_yearly_usd: 59.99,
      levels_unlocked: 30,
      cravings_unlocked: 2,
      forum_post_limit_per_day: 999,
      pause_tokens_per_month: 3,
      streak_recovery: true,
      ai_weekly_insight_summaries: true,
      dynamic_ai_coach: false,
      real_world_reward: false,
    },
    ultra: {
      id: 'ultra',
      name: 'Ultra',
      price_monthly_usd: 29.99,
      price_yearly_usd: 199.99,
      levels_unlocked: 30,
      cravings_unlocked: 5,
      forum_post_limit_per_day: 999,
      pause_tokens_per_month: 10,
      streak_recovery: true,
      ai_weekly_insight_summaries: true,
      dynamic_ai_coach: true,
      real_world_reward: true,
    },
  },

  // Feature Gates
  FEATURE_GATES: {
    LEVELS_UNLOCKED: { free: 10, plus: 30, ultra: 30 },
    CRAVINGS_COUNT: { free: 1, plus: 2, ultra: 5 },
    BATTLES_ENABLED: { free: false, plus: true, ultra: true },
    AI_CALLS_PER_DAY: { free: 10, plus: 50, ultra: 999 },
    FORUM_POSTS_PER_DAY: { free: 1, plus: 999, ultra: 999 },
    PAUSE_TOKENS_PER_MONTH: { free: 0, plus: 3, ultra: 10 },
  },

  // Battle Configuration
  BATTLE: {
    DURATION_HOURS: 24,
    TASKS_PER_BATTLE: 3,
    MATCHMAKING_LEVEL_TOLERANCE: 3, // ±3 levels
    MATCHMAKING_TIMEZONE_TOLERANCE: 2, // ±2 hours
    COOLDOWN_DAYS: 7, // Can't battle same person for 7 days
    REWARDS: {
      WINNER: { xp: 500, coins: 200 },
      LOSER: { xp: 100, coins: 50 },
    },
  },

  // Forum Configuration
  FORUM: {
    UPCOST_PER_UPVOTE: 10, // CraveCoins cost
    MAX_UPVOTES_PER_DAY: 50,
    AI_SUGGESTION_FILTERS: {
      MIN_REPLIES_FOR_SUGGESTION: 3,
      MIN_STREAK_FOR_SUGGESTION: 7,
      HIGH_IMPACT_THRESHOLD: 10, // replies for high-impact flag
    },
  },

  // Gamification
  BADGES: {
    STREAK_MILESTONES: [7, 14, 21, 30, 60, 90, 180, 365],
    LEVEL_MILESTONES: [10, 20, 30],
    BATTLE_MILESTONES: [1, 5, 10],
    FORUM_MILESTONES: [10, 50, 100],
  },

  // Trial Configuration
  TRIAL: {
    DURATION_DAYS: 14,
    TRIGGER_LEVEL: 10,
    UPGRADE_DISCOUNT_PERCENT: 50, // For relapse users
  },

  // Rate Limiting
  RATE_LIMITS: {
    API: {
      MUTATIONS: { requests: 10, window: 60 }, // 10 req/min
      READS: { requests: 100, window: 60 }, // 100 req/min
    },
    AI: {
      PER_USER_PER_DAY: { free: 10, plus: 50, ultra: 999 },
    },
  },

  // Cache Keys
  CACHE_KEYS: {
    AI_RESPONSE: (hash: string) => `ai_response:${hash}`,
    USER_SUMMARY: (userId: string) => `user_summary:${userId}`,
    LEVEL_TEMPLATE: (craving: string, level: number) => `level:${craving}:${level}`,
    FORUM_TEMPLATE: (topic: string) => `forum_template:${topic}`,
    BATTLE_TASKS: (craving: string) => `battle_tasks:${craving}`,
  },

  // Prompt Templates
  PROMPTS: {
    LEVEL_FEEDBACK: {
      model: 'gpt-5-nano',
      maxTokens: 20,
      template: 'User finished level {N} for {craving}. Response: {input}. Reply 15 words max, {persona} tone.',
    },
    FORUM_REPLY: {
      model: 'gpt-5-nano',
      maxTokens: 30,
      template: 'Thread: {title}. Suggest 20-word reply for {craving} community. Use {persona} tone.',
    },
    BATTLE_TASKS: {
      model: 'gpt-5-mini',
      maxTokens: 200,
      template: 'Generate 5 unique 24hr challenges for {craving}. Each 1 sentence. Use {persona} tone in descriptions.',
    },
    ONBOARDING_PERSONALIZATION: {
      model: 'gpt-5-mini',
      maxTokens: 150,
      template: 'Quiz: {answers}. Write 3 custom hints for days 1-3 of {craving} journey.',
    },
  },

  // Fallback Templates (when AI budget exceeded)
  FALLBACK_TEMPLATES: {
    LEVEL_FEEDBACK: [
      'Great work! Keep pushing forward. 💪',
      'You\'re making progress! Stay strong! 🔥',
      'Every step counts. You\'ve got this! ⚡',
      'Amazing effort! Keep the momentum going! 🚀',
      'You\'re building something powerful. Keep going! 💎',
    ],
    FORUM_REPLY: [
      'You\'re not alone in this journey. We\'ve got your back! 💪',
      'Every small step matters. Keep going! 🌟',
      'Your progress inspires others. Thank you for sharing! 🙏',
      'Stay strong! This community believes in you! 🔥',
      'You\'re doing better than you think. Keep pushing! ⚡',
    ],
  },

  // Monitoring
  MONITORING: {
    COST_ALERTS: {
      PER_USER_THRESHOLD: 0.015, // $0.015
      SYSTEM_WIDE_THRESHOLD: 0.008, // $0.008 per user average
    },
    METRICS: {
      CACHE_HIT_RATE_TARGET: 0.8, // 80%
      API_RESPONSE_TIME_TARGET: 500, // 500ms p95
      AI_FEEDBACK_TIME_TARGET: 3000, // 3s
    },
  },
} as const;

// Export PRICING_TIERS for backward compatibility
export const PRICING_TIERS = CONFIG.PRICING_TIERS;

// Type definitions for better type safety
export type SubscriptionTier = keyof typeof CONFIG.TIERS;
export type CravingType = 'nofap' | 'sugar' | 'shopping' | 'smoking_vaping' | 'social_media';
export type AIModelType = 'gpt-5-nano' | 'gpt-5-mini';
export type FeatureGate = keyof typeof CONFIG.FEATURE_GATES;

// Helper functions
export function getTierLimits(tier: SubscriptionTier) {
  return CONFIG.TIERS[tier];
}

export function canAccessFeature(tier: SubscriptionTier, feature: FeatureGate): boolean {
  const limits = CONFIG.FEATURE_GATES[feature];
  const tierKey = tier.toUpperCase() as keyof typeof limits;
  return limits[tierKey] !== false && limits[tierKey] !== 0;
}

export function getFeatureLimit(tier: SubscriptionTier, feature: FeatureGate): number {
  const limits = CONFIG.FEATURE_GATES[feature];
  const tierKey = tier.toUpperCase() as keyof typeof limits;
  return limits[tierKey] as number;
}

export function getAIRateLimit(tier: SubscriptionTier): number {
  const tierKey = tier.toUpperCase() as keyof typeof CONFIG.AI.RATE_LIMITS;
  return CONFIG.AI.RATE_LIMITS[tierKey].CALLS_PER_DAY;
}

export function getRandomFallbackTemplate(type: 'LEVEL_FEEDBACK' | 'FORUM_REPLY'): string {
  const templates = CONFIG.FALLBACK_TEMPLATES[type];
  return templates[Math.floor(Math.random() * templates.length)];
}
