// User context provider for state management with optimistic updates
'use client';

/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLogger } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';
import { trackJourneyEvent, trackLatency } from '@/lib/telemetry';

// Import Clerk hook normally - React requires hooks to be called unconditionally
// We'll handle ClerkProvider availability through AuthGate ensuring it's present when needed
import { useUser as useClerkUser } from '@clerk/nextjs';

interface UserProfile {
  id: string;
  clerk_user_id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
  primary_craving: string | null;
  current_level: number;
  xp: number;
  cravecoins: number;
  streak_count: number;
  subscription_tier: string;
  ai_summary: string;
  preferences: any;
  is_newbie?: boolean;
  onboarding_completed_at?: string | null;
}

interface UserContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isOnboardingComplete: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

interface UserProviderProps {
  children: React.ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // Centralized mock mode detection
  const mock = isMockMode();

  // ALWAYS call hooks at the top level - Rules of Hooks requirement
  // ClerkProvider is always available now (via AuthGate)
  // useUser() will safely return null user if not authenticated
  const clerkResult = useClerkUser();
  const logger = useLogger('UserProvider');

  // Determine user based on mock mode or actual Clerk user
  // This logic happens AFTER hooks are called unconditionally
  const user = useMemo(
    () => (mock ? { id: 'mock-user-123' } : clerkResult?.user || null),
    [mock, clerkResult?.user],
  );
  const isLoaded = mock ? true : (clerkResult?.isLoaded ?? false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  // Track if fetch is in progress to prevent duplicate calls
  const isFetchingRef = useRef(false);
  const profileLoggedRef = useRef(false);
  
  // Memoize user ID to prevent unnecessary re-renders
  const userId = user?.id || null;

  // Request cache to prevent duplicate fetches within short time window
  const lastFetchRef = useRef<{ timestamp: number; promise: Promise<void> } | null>(null);
  
  const fetchProfile = useCallback(async (traceId?: string) => {
    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      logger.info('Fetch already in progress, skipping');
      // Return existing promise if available
      if (lastFetchRef.current && Date.now() - lastFetchRef.current.timestamp < 1000) {
        return lastFetchRef.current.promise;
      }
      return;
    }
    
    // Check cache - if fetched within last 2 seconds, return cached promise
    if (lastFetchRef.current && Date.now() - lastFetchRef.current.timestamp < 2000) {
      logger.info('Using cached fetch result');
      return lastFetchRef.current.promise;
    }
    
    isFetchingRef.current = true;
    // Create fetch promise
  const fetchPromise = (async () => {
      const fetchStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      // MOCK MODE: Return mock data immediately, no API calls
      if (mock) {
        logger.info('Mock mode: Using mock profile data');
        const mockProfile: UserProfile = {
          id: 'mock-user-123',
          clerk_user_id: 'mock-clerk-id',
          name: 'Alex Chen',
          email: 'alex@example.com',
          avatar_url: null,
          primary_craving: 'nofap',
          current_level: 12,
          xp: 1250,
          cravecoins: 340,
          streak_count: 45,
          subscription_tier: 'free',
          ai_summary: 'You\'re doing amazing! Keep up the great work on your NoFap journey.',
          preferences: {
            quizAnswers: {
              severity: 'moderate',
              triggers: ['stress', 'boredom'],
              attempts: 'multiple'
            },
            personalization: {
              motivation: 'health',
              support_level: 'high'
            }
          },
          is_newbie: false,
          onboarding_completed_at: new Date().toISOString(),
        };
        setUserProfile(mockProfile);
        setSyncStatus('success');
        setIsLoading(false);
        isFetchingRef.current = false;
        trackLatency('profile_fetch', 0, true, { source: 'mock' });
        return;
      }

      // REAL MODE: Only make API calls when not in mock mode
      if (!user || !userId) {
        logger.info('No user available in real mode');
        setUserProfile(null);
        setSyncStatus('error');
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      logger.info('Fetching user profile from API', { userId });
      setSyncStatus('syncing');
      
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const PROFILE_FETCH_TIMEOUT_MS = 15000;
        const timeoutId = setTimeout(() => {
          logger.warn('Profile fetch exceeded timeout, aborting request', { userId });
          controller.abort();
        }, PROFILE_FETCH_TIMEOUT_MS);
        
        const response = await fetch('/api/user/profile', {
          headers: {
            'x-trace-id': traceId || Math.random().toString(36).substring(2, 15),
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }
        
        const data = await response.json();
        setUserProfile(data.user);
        setSyncStatus('success');
        logger.info('Profile fetched successfully', { profile: data.user });
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - fetchStart;
        trackLatency('profile_fetch', duration, true, {
          source: '/api/user/profile',
          mockUsed: data.mockUsed,
        });
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          logger.warn('Profile fetch aborted after timeout', { userId });
        } else {
          logger.error('Failed to fetch profile', { error: error instanceof Error ? error.message : 'Unknown error' });
          setError(error instanceof Error ? error.message : 'Failed to fetch profile');
        }
        setSyncStatus('error');
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - fetchStart;
        trackLatency('profile_fetch', duration, false, {
          reason: error instanceof Error ? error.message : 'unknown',
          source: '/api/user/profile',
        });
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    })();
    
    // Cache the promise
    lastFetchRef.current = {
      timestamp: Date.now(),
      promise: fetchPromise,
    };
    
    return fetchPromise;
  }, [userId, user, mock, logger]);

  // Debounce refresh calls to prevent rapid successive requests
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshProfile = useCallback(async () => {
    // Clear any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Debounce by 300ms
    refreshTimeoutRef.current = setTimeout(async () => {
      const traceId = Math.random().toString(36).substring(2, 15);
      await fetchProfile(traceId);
      refreshTimeoutRef.current = null;
    }, 300);
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userProfile) return;

    logger.info('Updating profile', { updates });
    
    // MOCK MODE: Just update state directly, no API calls
    if (mock) {
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      logger.info('Mock mode: Profile updated locally');
      return;
    }
    
    // REAL MODE: Optimistic update + API call
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
    
    try {
      // In a real implementation, you'd make an API call here
      // For now, we'll just refresh the profile
      await refreshProfile();
    } catch (err) {
      logger.error('Failed to update profile, reverting optimistic update', { error: err });
      // Revert optimistic update
      await refreshProfile();
    }
  }, [userProfile, logger, refreshProfile, mock]);

  // Fetch profile when user changes - use stable dependencies
  // Use ref to store latest fetchProfile to avoid dependency issues
  const fetchProfileRef = useRef(fetchProfile);
  useEffect(() => {
    fetchProfileRef.current = fetchProfile;
  }, [fetchProfile]);

  useEffect(() => {
    if (isLoaded && userId) {
      fetchProfileRef.current();
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    if (userProfile && !profileLoggedRef.current) {
      profileLoggedRef.current = true;
      trackJourneyEvent('profile_loaded_client', {
        metadata: {
          primaryCraving: userProfile.primary_craving,
          hasPersonalization: Boolean(userProfile.preferences?.onboarding),
          onboardingComplete: userProfile.is_newbie === false,
        },
      });
    }
  }, [userProfile]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Memoize onboarding status to prevent unnecessary recalculations
  const isOnboardingComplete = useMemo(() => {
    if (!userProfile) return false;
    if (typeof userProfile.is_newbie === 'boolean') {
      return !userProfile.is_newbie;
    }
    return userProfile.primary_craving !== null && userProfile.primary_craving !== undefined;
  }, [userProfile]);

  const value: UserContextType = {
    userProfile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
    isOnboardingComplete,
    syncStatus,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
