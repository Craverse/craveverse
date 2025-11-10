// Middleware for authentication and rate limiting
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimiters } from './lib/rate-limiter';
import { isMockMode } from './lib/utils';
import { hasCompletedOnboarding } from './lib/auth-utils';

// Check if we're in build phase - skip Clerk middleware during build
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
  '/api/health',
  // '/api/stripe/webhook', // Stripe disabled - free tier only
]);

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/workspace(.*)',
  '/battles(.*)',
  '/forum(.*)',
  '/upgrade(.*)',
  '/admin(.*)',
  '/map(.*)',
  '/shop(.*)',
  '/leaderboard(.*)',
  '/settings(.*)',
  '/levels(.*)',
  '/progress(.*)',
  '/api/levels(.*)',
  '/api/battles(.*)',
  '/api/forum(.*)',
  '/api/ai(.*)',
  '/api/user(.*)',
  '/api/shop(.*)',
  '/api/settings(.*)',
  // '/api/stripe(.*)', // Stripe disabled - free tier only
]);

// Use centralized mock mode detection
const shouldUseClerk = !isMockMode() && !isBuildTime;

// Use Clerk middleware if keys are available, otherwise bypass
export default shouldUseClerk 
  ? clerkMiddleware(async (auth, req) => {
      const { userId } = await auth();
      const url = new URL(req.url);
      const pathname = url.pathname;
      
      // If user is authenticated and on landing page, redirect based on onboarding status
      if (userId && pathname === '/') {
        try {
          const onboardingComplete = await hasCompletedOnboarding(userId);
          if (onboardingComplete) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
          } else {
            return NextResponse.redirect(new URL('/onboarding', req.url));
          }
        } catch {
          // If check fails, redirect to onboarding (safe default)
          return NextResponse.redirect(new URL('/onboarding', req.url));
        }
      }
      
      // Allow public routes without auth check
      if (isPublicRoute(req)) {
        return NextResponse.next();
      }
      
      // Protect authenticated routes - redirect to sign-in if not authenticated
      if (isProtectedRoute(req)) {
        if (!userId) {
          // Redirect to sign-up (which will initialize Clerk) instead of sign-in
          return NextResponse.redirect(new URL('/sign-up', req.url));
        }
      }
      
      return NextResponse.next();
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

// Rate limiting middleware for API routes
export async function rateLimitMiddleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Skip rate limiting in mock mode
  if (isMockMode()) {
    return NextResponse.next();
  }
  
  // Skip rate limiting for webhooks and health checks
  if (pathname.includes('/webhooks/') || pathname.includes('/health')) {
    return NextResponse.next();
  }
  
  // Get user ID from request headers (set by Clerk)
  const userId = request.headers.get('x-user-id');
  const userTier = request.headers.get('x-user-tier') as 'free' | 'plus' | 'ultra' || 'free';
  
  // Apply rate limiting based on endpoint
  if (pathname.startsWith('/api/levels/complete')) {
    const limiter = rateLimiters.apiMutations;
    const result = await limiter.checkLimit(userId || 'anonymous');
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limiter['config'].requests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
          },
        }
      );
    }
  }
  
  if (pathname.startsWith('/api/ai/')) {
    // Check AI call limits based on user tier
    const aiLimiter = rateLimiters.aiCalls;
    aiLimiter['config'].requests = getAIRateLimit(userTier);
    
    const result = await aiLimiter.checkLimit(userId || 'anonymous');
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'AI rate limit exceeded',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': aiLimiter['config'].requests.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
          },
        }
      );
    }
  }
  
  return NextResponse.next();
}

// Helper function to get AI rate limit based on tier
function getAIRateLimit(tier: 'free' | 'plus' | 'ultra'): number {
  const limits = {
    free: 10,
    plus: 50,
    ultra: 999,
  };
  return limits[tier];
}
