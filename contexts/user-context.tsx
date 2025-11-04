// User context provider for state management with optimistic updates
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useLogger } from '@/lib/logger';
import { isMockMode } from '@/lib/utils';

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
  const user = mock ? { id: 'mock-user-123' } : (clerkResult?.user || null);
  const isLoaded = mock ? true : (clerkResult?.isLoaded ?? false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  
  // Track if fetch is in progress to prevent duplicate calls
  const isFetchingRef = useRef(false);
  
  // Memoize user ID to prevent unnecessary re-renders
  const userId = user?.id || null;

  const fetchProfile = useCallback(async (traceId?: string) => {
    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      logger.info('Fetch already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
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
        }
      };
      setUserProfile(mockProfile);
      setSyncStatus('success');
      setIsLoading(false);
      isFetchingRef.current = false;
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
      const response = await fetch('/api/user/profile', {
        headers: {
          'x-trace-id': traceId || Math.random().toString(36).substring(2, 15),
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const data = await response.json();
      setUserProfile(data.user);
      setSyncStatus('success');
      logger.info('Profile fetched successfully', { profile: data.user });
    } catch (error) {
      logger.error('Failed to fetch profile', { error: error instanceof Error ? error.message : 'Unknown error' });
      setError(error instanceof Error ? error.message : 'Failed to fetch profile');
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId, mock, logger]);

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
    // Only depend on isLoaded and userId - fetchProfile accessed via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userId]);

  // Refresh profile when window becomes visible
  // Use ref to store latest refreshProfile to avoid dependency issues
  const refreshProfileRef = useRef(refreshProfile);
  useEffect(() => {
    refreshProfileRef.current = refreshProfile;
  }, [refreshProfile]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        logger.info('Window became visible, refreshing profile');
        refreshProfileRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Cleanup debounce timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
    // Only depend on userId - refreshProfile accessed via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Memoize onboarding status to prevent unnecessary recalculations
  const isOnboardingComplete = useMemo(() => {
    return userProfile?.primary_craving !== null && userProfile?.primary_craving !== undefined;
  }, [userProfile?.primary_craving]);

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
