// Main dashboard for CraveVerse
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserContext } from '@/contexts/user-context';
import { DashboardStats } from '@/components/dashboard-stats';
import { QuickActions } from '@/components/quick-actions';
import { RecentActivity } from '@/components/recent-activity';
import { LevelCard } from '@/components/levels/level-card';
import { PauseTokenWidget } from '@/components/dashboard/pause-token-widget';
import { DebugPanel } from '@/components/debug-panel';
import { useLogger } from '@/lib/logger';
import { trackJourneyEvent, trackLatency } from '@/lib/telemetry';
import { isMockMode } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const logger = useLogger('DashboardPage');
  const { userProfile, isLoading, error, isOnboardingComplete } = useUserContext();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const mock = isMockMode();

  // Client-side auth check - redirect if not authenticated
  useEffect(() => {
    if (clerkLoaded && !mock) {
      if (!clerkUser) {
        logger.info('User not authenticated - redirecting to sign-up');
        router.push('/sign-up');
      }
    }
  }, [clerkUser, clerkLoaded, mock, router, logger]);

  // Check if user needs onboarding
  useEffect(() => {
    if (!isLoading && userProfile && !isOnboardingComplete) {
      logger.info('User needs onboarding - redirecting to /onboarding');
      router.push('/onboarding');
      return;
    }
  }, [isLoading, userProfile, isOnboardingComplete, router, logger]);

  // State for fetched level data
  const [fetchedLevelData, setFetchedLevelData] = useState<any>(null);
  
  // Ref to track if fetch is in progress (request deduplication)
  const isFetchingLevelRef = useRef(false);
  const personalizationLoggedRef = useRef(false);

  const LEVEL_FETCH_TIMEOUT_MS = 15000;

  const fetchLevelData = useCallback(async () => {
    if (!userProfile?.current_level || !userProfile?.primary_craving) {
      return;
    }

    if (isFetchingLevelRef.current) {
      return;
    }

    isFetchingLevelRef.current = true;
    const fetchStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let latencyReported = false;

    try {
      let resolvedLevel: any | null = null;
      let resolvedSource: 'level-detail' | 'levels-list' | 'fallback' = 'fallback';

      const levelId = `level-${userProfile.current_level}`;
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => {
        logger.warn('Level detail fetch exceeded timeout, aborting request', { levelId });
        controller.abort();
      }, LEVEL_FETCH_TIMEOUT_MS);

      const response = await fetch(`/api/levels/${levelId}`, {
        signal: controller.signal,
      });

      clearTimeout(fetchTimeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.level) {
          resolvedLevel = data.level;
          resolvedSource = 'level-detail';
        }
      }

      if (!resolvedLevel) {
        const fallbackController = new AbortController();
        const fallbackTimeoutId = setTimeout(() => {
          logger.warn('Levels list fetch exceeded timeout, aborting request', { craving: userProfile.primary_craving });
          fallbackController.abort();
        }, LEVEL_FETCH_TIMEOUT_MS);

        const levelsResponse = await fetch(`/api/levels?craving=${userProfile.primary_craving}`, {
          signal: fallbackController.signal,
        });

        clearTimeout(fallbackTimeoutId);

        if (levelsResponse.ok) {
          const levelsData = await levelsResponse.json();
          const matchingLevel = levelsData.levels?.find(
            (l: any) => l.level_number === userProfile.current_level,
          );
          if (matchingLevel) {
            resolvedLevel = matchingLevel;
            resolvedSource = 'levels-list';
          }
        }
      }

      if (resolvedLevel) {
        setFetchedLevelData(resolvedLevel);
        logger.info('Level data loaded', { levelId: resolvedLevel.id, source: resolvedSource });
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - fetchStart;
        trackLatency('level_data_fetch', duration, true, {
          source: resolvedSource,
          levelNumber: resolvedLevel.level_number,
        });
        latencyReported = true;
      } else {
        logger.warn('Level data unavailable after retries', { levelId });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Level data request aborted after timeout');
      } else {
        logger.error('Error fetching level data', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } finally {
      if (!latencyReported) {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - fetchStart;
        trackLatency('level_data_fetch', duration, false, {
          source: 'timeout',
          levelNumber: userProfile?.current_level,
        });
      }
      isFetchingLevelRef.current = false;
    }
  }, [logger, userProfile?.current_level, userProfile?.primary_craving]);

  useEffect(() => {
    fetchLevelData();
  }, [fetchLevelData]);

  // Memoize level data at the top level (before any conditional returns)
  // This must be called unconditionally to comply with Rules of Hooks
  const currentLevelData = useMemo(() => {
    // Use fetched level data if available
    if (fetchedLevelData) {
      return {
        id: fetchedLevelData.id || `level-${fetchedLevelData.level_number}`,
        level_number: fetchedLevelData.level_number,
        title: fetchedLevelData.title || 'Mindful Awareness',
        description: fetchedLevelData.description || 'A focused step in your 30-level journey.',
        challenge_text: fetchedLevelData.challenge_text || 'Perform 10 minutes of mindful breathing when urges arise.',
        xp_reward: fetchedLevelData.xp_reward || 100,
        coin_reward: fetchedLevelData.coin_reward || 25,
        difficulty: (fetchedLevelData.difficulty || 'medium'),
      };
    }
    
    // Fallback to userProfile-based data if no fetched data yet
    if (!userProfile) {
      return {
        id: 'level-1',
        level_number: 1,
        title: 'Mindful Awareness',
        description: 'A focused step in your 30-level journey.',
        challenge_text: 'Perform 10 minutes of mindful breathing when urges arise.',
        xp_reward: 100,
        coin_reward: 25,
        difficulty: 'medium' as const,
      };
    }
    
    return {
      id: `level-${userProfile.current_level}`,
      level_number: userProfile.current_level,
      title: 'Mindful Awareness',
      description: 'A focused step in your 30-level journey.',
      challenge_text: 'Perform 10 minutes of mindful breathing when urges arise.',
      xp_reward: 100,
      coin_reward: 25,
      difficulty: 'medium' as const,
    };
  }, [fetchedLevelData, userProfile]);

  const onboardingPersonalization = useMemo(() => {
    if (!userProfile?.preferences || typeof userProfile.preferences !== 'object') {
      return null;
    }
    const onboardingPrefs = (userProfile.preferences as Record<string, any>).onboarding;
    if (!onboardingPrefs || typeof onboardingPrefs !== 'object') {
      return null;
    }
    return onboardingPrefs.personalization ?? onboardingPrefs;
  }, [userProfile]);

  useEffect(() => {
    if (onboardingPersonalization && userProfile && !personalizationLoggedRef.current) {
      personalizationLoggedRef.current = true;
      trackJourneyEvent('dashboard_personalization_applied', {
        metadata: {
          primaryCraving: userProfile.primary_craving,
          hasIntro: Boolean(onboardingPersonalization?.introMessage),
        },
      });
    }
  }, [onboardingPersonalization, userProfile]);

  useEffect(() => {
    if (fetchedLevelData) {
      trackJourneyEvent('level_data_loaded', {
        metadata: {
          levelNumber: fetchedLevelData.level_number,
          source: 'api',
        },
      });
    }
  }, [fetchedLevelData]);

  useEffect(() => {
    if (userProfile?.current_level) {
      trackJourneyEvent('level_presented', {
        metadata: {
          levelNumber: userProfile.current_level,
          source: fetchedLevelData ? 'api' : 'profile',
        },
      });
    }
  }, [userProfile?.current_level, fetchedLevelData]);

  // Show loading state only for critical data (auth and profile)
  // Don't block dashboard render for level data - it loads in background
  if (!clerkLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show redirect message if not authenticated (will redirect via useEffect)
  if (!mock && !clerkUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange mx-auto"></div>
          <p className="text-muted-foreground">Redirecting to sign up...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Error Loading Dashboard</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Show onboarding prompt if no profile
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Welcome to CraveVerse</h1>
          <p className="text-muted-foreground">Please complete your setup to get started.</p>
          <button 
            onClick={() => router.push('/onboarding')}
            className="px-4 py-2 bg-crave-orange text-white rounded-md hover:bg-crave-orange-dark"
          >
            Start Setup
          </button>
        </div>
      </div>
    );
  }

  // Show dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userProfile.name}!</h1>
              <p className="text-gray-600 mt-1">
                {onboardingPersonalization?.introMessage
                  ? onboardingPersonalization.introMessage
                  : `Ready to continue your ${userProfile.primary_craving} journey? You're on level ${userProfile.current_level}!`}
              </p>
            </div>
              <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-crave-orange">{userProfile.streak_count}</div>
                <div className="text-sm text-gray-500">Day Streak</div>
              </div>
              <div className="w-12 h-12 bg-crave-orange rounded-full flex items-center justify-center text-white font-bold text-lg">
                {userProfile.current_level}
              </div>
                </div>
              </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <DashboardStats 
          streak={userProfile.streak_count}
          currentLevel={userProfile.current_level}
          totalXP={userProfile.xp}
          totalCoins={userProfile.cravecoins}
          maxLevel={30}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Challenge via LevelCard */}
          <div className="lg:col-span-2">
                  <LevelCard
              level={currentLevelData}
              onComplete={() => {}}
                    userTier={userProfile.subscription_tier}
                  />
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <PauseTokenWidget />
            <QuickActions />
            <RecentActivity />
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
            <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Level Progress</span>
                  <span className="text-crave-orange font-bold">{Math.round((userProfile.current_level / 30) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-crave-orange to-orange-500 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${(userProfile.current_level / 30) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Level {userProfile.current_level}</span>
                  <span>Level 30</span>
                    </div>
                  </div>
                  
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-crave-orange">{userProfile.streak_count}</div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userProfile.xp.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total XP</div>
                    </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{userProfile.cravecoins}</div>
                  <div className="text-sm text-gray-600">CraveCoins</div>
                    </div>
                  </div>
                </div>
          </div>
        </div>
        {/* Debug Panel (dev only) */}
        <DebugPanel logs={[]} userState={userProfile} />
      </div>
    </div>
  );
}