// Rate Limiter for API endpoints and AI calls
import { cache } from './cache';
import { CONFIG } from './config';

interface RateLimitConfig {
  requests: number;
  window: number; // in seconds
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Rate limiter class
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  // Check if request is allowed
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      // Get current count from cache
      const cached = await cache.get(key);
      const currentCount = cached ? parseInt(cached) : 0;

      // Check if limit exceeded
      if (currentCount >= this.config.requests) {
        const resetTime = now + this.config.window;
        const retryAfter = this.config.window - (now % this.config.window);
        
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter,
        };
      }

      // Increment counter
      const newCount = currentCount + 1;
      await cache.set(key, newCount.toString(), this.config.window);

      return {
        allowed: true,
        remaining: this.config.requests - newCount,
        resetTime: now + this.config.window,
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if cache fails
      return {
        allowed: true,
        remaining: this.config.requests,
        resetTime: now + this.config.window,
      };
    }
  }

  // Reset rate limit for identifier
  async resetLimit(identifier: string): Promise<void> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    await cache.del(key);
  }
}

// Predefined rate limiters
export const rateLimiters = {
  // API mutations (10 req/min)
  apiMutations: new RateLimiter({
    requests: CONFIG.RATE_LIMITS.API.MUTATIONS.requests,
    window: CONFIG.RATE_LIMITS.API.MUTATIONS.window,
    keyPrefix: 'api_mutations',
  }),

  // API reads (100 req/min)
  apiReads: new RateLimiter({
    requests: CONFIG.RATE_LIMITS.API.READS.requests,
    window: CONFIG.RATE_LIMITS.API.READS.window,
    keyPrefix: 'api_reads',
  }),

  // AI calls per user per day
  aiCalls: new RateLimiter({
    requests: 999, // Will be set dynamically based on user tier
    window: 24 * 60 * 60, // 24 hours
    keyPrefix: 'ai_calls',
  }),

  // Forum posts per day
  forumPosts: new RateLimiter({
    requests: 999, // Will be set dynamically based on user tier
    window: 24 * 60 * 60, // 24 hours
    keyPrefix: 'forum_posts',
  }),

  // Battle requests per day
  battleRequests: new RateLimiter({
    requests: 5,
    window: 24 * 60 * 60, // 24 hours
    keyPrefix: 'battle_requests',
  }),

  // Login attempts per hour
  loginAttempts: new RateLimiter({
    requests: 5,
    window: 60 * 60, // 1 hour
    keyPrefix: 'login_attempts',
  }),

  // Password reset requests per hour
  passwordReset: new RateLimiter({
    requests: 3,
    window: 60 * 60, // 1 hour
    keyPrefix: 'password_reset',
  }),
};

// Dynamic rate limiter factory
export function createRateLimiter(
  requests: number,
  window: number,
  keyPrefix: string
): RateLimiter {
  return new RateLimiter({ requests, window, keyPrefix });
}

// User-specific rate limiter based on subscription tier
export function getUserRateLimiter(tier: 'free' | 'plus' | 'ultra', type: 'ai' | 'forum'): RateLimiter {
  const tierKey = tier.toUpperCase() as keyof typeof CONFIG.TIERS;
  const limits = CONFIG.TIERS[tierKey];
  
  switch (type) {
    case 'ai':
      const aiTierKey = tier.toUpperCase() as keyof typeof CONFIG.AI.RATE_LIMITS;
      return new RateLimiter({
        requests: CONFIG.AI.RATE_LIMITS[aiTierKey].CALLS_PER_DAY,
        window: 24 * 60 * 60,
        keyPrefix: `ai_calls_${tier}`,
      });
    case 'forum':
      return new RateLimiter({
        requests: limits.FORUM_POSTS_PER_DAY,
        window: 24 * 60 * 60,
        keyPrefix: `forum_posts_${tier}`,
      });
    default:
      throw new Error(`Unknown rate limiter type: ${type}`);
  }
}

// Rate limiting middleware for Next.js API routes
export function withRateLimit(
  limiter: RateLimiter,
  identifier: string | ((req: any) => string)
) {
  return async (req: any, res: any, next?: any) => {
    try {
      const id = typeof identifier === 'function' ? identifier(req) : identifier;
      const result = await limiter.checkLimit(id);

      if (!result.allowed) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
          resetTime: result.resetTime,
        });
        return;
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', limiter['config'].requests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (next) {
        next();
      }
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      // Fail open - allow request if rate limiting fails
      if (next) {
        next();
      }
    }
  };
}

// IP-based rate limiter for anonymous requests
export function getIPRateLimiter(ip: string): RateLimiter {
  return new RateLimiter({
    requests: 100, // 100 requests per hour for anonymous users
    window: 60 * 60, // 1 hour
    keyPrefix: `ip_${ip}`,
  });
}

// User-based rate limiter for authenticated requests
export function getUserRateLimiterForEndpoint(
  userId: string,
  endpoint: string,
  tier: 'free' | 'plus' | 'ultra'
): RateLimiter {
  const endpointLimits = {
    '/api/levels/complete': { requests: 10, window: 60 * 60 }, // 10 per hour
    '/api/battles/matchmake': { requests: 3, window: 60 * 60 }, // 3 per hour
    '/api/forum/posts': { requests: 5, window: 60 * 60 }, // 5 per hour
    '/api/ai/generate': { requests: 20, window: 60 * 60 }, // 20 per hour
  };

  const limit = endpointLimits[endpoint as keyof typeof endpointLimits] || {
    requests: 10,
    window: 60 * 60,
  };

  // Adjust limits based on tier
  const multiplier = tier === 'ultra' ? 3 : tier === 'plus' ? 2 : 1;

  return new RateLimiter({
    requests: limit.requests * multiplier,
    window: limit.window,
    keyPrefix: `user_${userId}_${endpoint}`,
  });
}

// Rate limiting utilities
export class RateLimitUtils {
  // Check if user can make AI call
  static async canMakeAICall(userId: string, tier: 'free' | 'plus' | 'ultra'): Promise<boolean> {
    const limiter = getUserRateLimiter(tier, 'ai');
    const result = await limiter.checkLimit(userId);
    return result.allowed;
  }

  // Check if user can make forum post
  static async canMakeForumPost(userId: string, tier: 'free' | 'plus' | 'ultra'): Promise<boolean> {
    const limiter = getUserRateLimiter(tier, 'forum');
    const result = await limiter.checkLimit(userId);
    return result.allowed;
  }

  // Get user's remaining AI calls for today
  static async getRemainingAICalls(userId: string, tier: 'free' | 'plus' | 'ultra'): Promise<number> {
    const limiter = getUserRateLimiter(tier, 'ai');
    const result = await limiter.checkLimit(userId);
    return result.remaining;
  }

  // Get user's remaining forum posts for today
  static async getRemainingForumPosts(userId: string, tier: 'free' | 'plus' | 'ultra'): Promise<number> {
    const limiter = getUserRateLimiter(tier, 'forum');
    const result = await limiter.checkLimit(userId);
    return result.remaining;
  }

  // Reset all rate limits for a user (useful for testing or admin actions)
  static async resetUserRateLimits(userId: string): Promise<void> {
    const limiters = [
      getUserRateLimiter('free', 'ai'),
      getUserRateLimiter('plus', 'ai'),
      getUserRateLimiter('ultra', 'ai'),
      getUserRateLimiter('free', 'forum'),
      getUserRateLimiter('plus', 'forum'),
      getUserRateLimiter('ultra', 'forum'),
    ];

    for (const limiter of limiters) {
      await limiter.resetLimit(userId);
    }
  }

  // Get rate limit status for user
  static async getUserRateLimitStatus(
    userId: string,
    tier: 'free' | 'plus' | 'ultra'
  ): Promise<{
    aiCalls: { remaining: number; resetTime: number };
    forumPosts: { remaining: number; resetTime: number };
  }> {
    const aiLimiter = getUserRateLimiter(tier, 'ai');
    const forumLimiter = getUserRateLimiter(tier, 'forum');

    const aiResult = await aiLimiter.checkLimit(userId);
    const forumResult = await forumLimiter.checkLimit(userId);

    return {
      aiCalls: {
        remaining: aiResult.remaining,
        resetTime: aiResult.resetTime,
      },
      forumPosts: {
        remaining: forumResult.remaining,
        resetTime: forumResult.resetTime,
      },
    };
  }
}

// Rate limiting decorator for API routes
export function rateLimit(
  limiter: RateLimiter,
  getIdentifier: (req: any) => string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (req: any, res: any) {
      try {
        const identifier = getIdentifier(req);
        const result = await limiter.checkLimit(identifier);

        if (!result.allowed) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime,
          });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', limiter['config'].requests);
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', result.resetTime);

        return originalMethod.call(this, req, res);
      } catch (error) {
        console.error('Rate limiting decorator error:', error);
        // Fail open - allow request if rate limiting fails
        return originalMethod.call(this, req, res);
      }
    };

    return descriptor;
  };
}
