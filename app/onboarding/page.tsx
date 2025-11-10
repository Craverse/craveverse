// Onboarding flow for new users
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CravingSelector } from '../../components/onboarding/craving-selector';
import { OnboardingQuiz } from '../../components/onboarding/onboarding-quiz';
import { PersonalizationResults } from '../../components/onboarding/personalization-results';
import { useUserContext } from '@/contexts/user-context'; // NEW: Import context
import { useLogger } from '@/lib/logger'; // NEW: Import logger
import { toast } from 'sonner';
import { isMockMode } from '@/lib/utils';
import { trackJourneyEvent, trackLatency } from '@/lib/telemetry';

interface OnboardingData {
  selectedCraving: string | null;
  quizAnswers: Record<string, any>;
  personalization: any;
  quizVersion: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const mock = isMockMode();
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { refreshProfile, isOnboardingComplete, isLoading: profileLoading } = useUserContext(); // NEW: Get refresh methods
  const logger = useLogger('OnboardingPage'); // NEW: Use logger
  const QUIZ_VERSION = 'v1';
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    selectedCraving: null,
    quizAnswers: {},
    personalization: null,
    quizVersion: QUIZ_VERSION,
  });
  const [isLoading, setIsLoading] = useState(false);
  const isAuthReady = mock || clerkLoaded;
  const hasSession = mock || isSignedIn;
  const activeUser = mock ? { id: 'mock-user-123' } : user;

  useEffect(() => {
    trackJourneyEvent('onboarding_start', { phase: 'intro' });
  }, []);

  useEffect(() => {
    if (mock) return;
    if (clerkLoaded && !isSignedIn) {
      trackJourneyEvent('onboarding_redirect', {
        phase: 'auth',
        metadata: { destination: '/sign-in' },
      });
      router.replace('/sign-in');
    }
  }, [mock, clerkLoaded, isSignedIn, router]);

  useEffect(() => {
    if (mock) return;
    if (!profileLoading && isOnboardingComplete) {
      trackJourneyEvent('onboarding_redirect', {
        phase: 'post-completion',
        metadata: { destination: '/dashboard' },
      });
      router.replace('/dashboard');
    }
  }, [mock, profileLoading, isOnboardingComplete, router]);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleCravingSelect = (craving: string) => {
    // Validate craving selection
    if (!craving || craving.trim() === '') {
      logger.warn('No craving selected');
      // Show error message to user
      toast.error('Selection required', {
        description: 'Please select a craving type to continue.',
      });
      return;
    }
    
    setOnboardingData(prev => ({ ...prev, selectedCraving: craving }));
    setCurrentStep(2);
    trackJourneyEvent('onboarding_craving_selected', {
      phase: 'quiz',
      metadata: { craving },
    });
  };

  const handleQuizComplete = (answers: Record<string, any>) => {
    // Validate quiz answers
    if (!answers || Object.keys(answers).length === 0) {
      logger.warn('Quiz answers empty');
      // Show error message to user
      toast.error('Quiz incomplete', {
        description: 'Please complete all quiz questions to continue.',
      });
      return;
    }
    
    setOnboardingData(prev => ({ ...prev, quizAnswers: answers, quizVersion: QUIZ_VERSION }));
    setCurrentStep(3);
    trackJourneyEvent('onboarding_quiz_completed', {
      phase: 'personalization',
      metadata: { craving: onboardingData.selectedCraving },
    });
    
    // Trigger AI personalization
    triggerPersonalization(answers);
  };

  const triggerPersonalization = async (answers: Record<string, any>) => {
    if (!onboardingData.selectedCraving) return;

    setIsLoading(true);
    
    const personalizationStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      const response = await fetch('/api/onboarding/personalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          craving: onboardingData.selectedCraving,
          quizAnswers: answers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate personalization' }));
        throw new Error(errorData.error || 'Failed to generate personalization');
      }

      const personalization = await response.json();
      setOnboardingData(prev => ({ ...prev, personalization }));
      setCurrentStep(4);
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - personalizationStart;
      trackLatency('onboarding_personalization', duration, true, {
        craving: onboardingData.selectedCraving,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Personalization error', { error: errorMessage });
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - personalizationStart;
      trackLatency('onboarding_personalization', duration, false, {
        craving: onboardingData.selectedCraving,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      
      // Show error to user
      toast.error('Personalization failed', {
        description: 'Using default personalization. You can still proceed with your journey.',
      });
      
      // Fallback to generic personalization
      setOnboardingData(prev => ({
        ...prev,
        personalization: {
          introMessage: `Welcome to your ${onboardingData.selectedCraving} journey! You've got this!`,
          customHints: [
            'Start each day with intention',
            'Track your triggers carefully',
            'Celebrate small wins',
          ],
        },
      }));
      setCurrentStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!onboardingData.selectedCraving) return;

    setIsLoading(true);

    const submitStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    try {
      logger.info('Starting onboarding completion process', { 
        craving: onboardingData.selectedCraving,
        hasPersonalization: !!onboardingData.personalization 
      });

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': logger.getTraceId(),
        },
        body: JSON.stringify({
          craving: onboardingData.selectedCraving,
          quizAnswers: onboardingData.quizAnswers,
          personalization: onboardingData.personalization,
          quizVersion: onboardingData.quizVersion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Onboarding completion API error', { status: response.status, error: errorData });
        throw new Error('Failed to complete onboarding');
      }

      const result = await response.json();
      logger.info('Onboarding completion successful', { result });
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - submitStart;
      trackLatency('onboarding_completion_submit', duration, true, {
        craving: onboardingData.selectedCraving,
      });
      trackJourneyEvent('onboarding_completion_client', {
        success: true,
        phase: 'post-completion',
        metadata: { craving: onboardingData.selectedCraving },
      });

      // Enhanced verification with context refresh
      if (refreshProfile) {
        logger.info('Force refreshing user context after onboarding');
        await refreshProfile();
        
        // Additional verification with API call
        const verifyResponse = await fetch(`/api/user/profile?t=${Date.now()}&force=true`, {
          headers: {
            'Cache-Control': 'no-cache',
            'x-trace-id': logger.getTraceId() + '-verify',
          },
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          logger.info('Final verification result', {
            primary_craving: verifyData.user?.primary_craving,
            hasProfile: !!verifyData.user
          });
          trackJourneyEvent('onboarding_verification', {
            phase: 'post-completion',
            metadata: {
              primaryCraving: verifyData.user?.primary_craving,
              hasProfile: Boolean(verifyData.user),
            },
          });
        }
      }

      // Use a small delay to ensure state updates propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to dashboard
      logger.info('Redirecting to dashboard after onboarding completion');
      router.push('/dashboard');
      
    } catch (error) {
      logger.error('Onboarding completion error', { error: error instanceof Error ? error.message : 'Unknown error' });
      const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - submitStart;
      trackLatency('onboarding_completion_submit', duration, false, {
        craving: onboardingData.selectedCraving,
        reason: error instanceof Error ? error.message : 'unknown',
      });
      trackJourneyEvent('onboarding_completion_client', {
        success: false,
        phase: 'post-completion',
        metadata: { craving: onboardingData.selectedCraving },
      });
      // Still redirect to dashboard with fallback
      logger.info('Error occurred, still redirecting to dashboard with fallback...');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-crave-orange to-crave-pinkish-orange bg-clip-text text-transparent">
                Welcome to CraveVerse
              </h1>
              <p className="text-xl text-muted-foreground">
                Your journey to conquering cravings starts here
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Choose Your Battle</CardTitle>
                <CardDescription className="text-center">
                  Select the craving you want to conquer first
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CravingSelector onSelect={handleCravingSelect} />
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Tell Us About Yourself</h2>
              <p className="text-lg text-muted-foreground">
                Help us personalize your journey
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Quick Assessment</CardTitle>
                <CardDescription className="text-center">
                  A few questions to understand your situation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OnboardingQuiz
                  craving={onboardingData.selectedCraving!}
                  onComplete={handleQuizComplete}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Creating Your Personal Plan</h2>
              <p className="text-lg text-muted-foreground">
                Our AI is analyzing your responses...
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
                  <p className="text-muted-foreground">
                    Generating personalized insights and recommendations...
                  </p>
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        logger.info('Skipping personalization, using defaults');
                        setOnboardingData(prev => ({
                          ...prev,
                          personalization: {
                            introMessage: `Welcome to your ${onboardingData.selectedCraving} recovery journey! You've got this!`,
                            customHints: [
                              'Start each day with intention',
                              'Track your triggers carefully',
                              'Celebrate small wins'
                            ]
                          }
                        }));
                        setCurrentStep(4);
                      }}
                    >
                      Skip Personalization
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Your Journey Begins</h2>
              <p className="text-lg text-muted-foreground">
                Here's your personalized roadmap
              </p>
            </div>
            
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-center">Personalized for You</CardTitle>
                <CardDescription className="text-center">
                  Based on your responses, here's what we recommend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalizationResults
                  personalization={onboardingData.personalization!}
                  craving={onboardingData.selectedCraving!}
                  onComplete={handleComplete}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
      </div>
    );
  }

  if (!hasSession || !activeUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Please sign in</h1>
          <p className="text-muted-foreground">You need to be signed in to access onboarding.</p>
          <Button onClick={() => router.push('/sign-in')}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <Badge variant="secondary">{Math.round(progress)}% Complete</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        {currentStep > 1 && currentStep < 4 && (
          <div className="max-w-2xl mx-auto mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={isLoading}
            >
              Back
            </Button>
            <div className="text-sm text-muted-foreground">
              {currentStep === 2 && 'Answer the questions to continue'}
              {currentStep === 3 && 'Please wait while we personalize your experience'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}