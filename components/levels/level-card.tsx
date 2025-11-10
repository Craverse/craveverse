'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useLogger } from '@/lib/logger';
import { trackJourneyEvent, trackLatency } from '@/lib/telemetry';
import { 
  Target, 
  Trophy, 
  Coins, 
  Zap,
  Star,
  CheckCircle,
  Lock,
  SkipForward,
  AlertCircle
} from 'lucide-react';

interface Level {
  id: string;
  level_number: number;
  title: string;
  description: string;
  challenge_text: string;
  xp_reward: number;
  coin_reward: number;
  difficulty: string;
  completed_at?: string;
}

interface CompletionResult {
  rewards?: { xp?: number; coins?: number };
  aiFeedback?: string;
  completionNote?: string;
}

interface LevelCardProps {
  level: Level;
  onComplete: (result?: CompletionResult | null) => void;
  userTier: string;
  completionNote?: string;
  onShare?: () => void;
}

export function LevelCard({ level, onComplete, userTier, completionNote, onShare }: LevelCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!level.completed_at);
  const [completionSummary, setCompletionSummary] = useState<CompletionResult | null>(null);

  const [hasSkipToken, setHasSkipToken] = useState(false);
  const [isCheckingSkip, setIsCheckingSkip] = useState(true);
  const logger = useLogger('LevelCard');
  const levelLoggedRef = useRef<number | null>(null);
  const levelNumber = level.level_number;
  const levelDifficulty = level.difficulty;
  const levelCompletedAt = level.completed_at;

  // Check if user has level skip in inventory
  useEffect(() => {
    const checkSkipToken = async () => {
      try {
        const response = await fetch('/api/rewards/inventory');
        if (response.ok) {
          const data = await response.json();
          const hasSkip = (data.inventory || []).some(
            (item: any) => item.effects?.level_skip && item.quantity > 0
          );
          setHasSkipToken(hasSkip);
          trackJourneyEvent('level_skip_inventory_checked', {
            metadata: {
              levelNumber: level.level_number,
              hasSkipToken: hasSkip,
            },
          });
        }
      } catch (error) {
        logger.error('Error checking skip token', { error: error instanceof Error ? error.message : 'Unknown' });
      } finally {
        setIsCheckingSkip(false);
      }
    };
    checkSkipToken();
  }, [logger, level.level_number]);

  useEffect(() => {
    if (levelLoggedRef.current === levelNumber) {
      return;
    }
    levelLoggedRef.current = levelNumber;
    trackJourneyEvent('level_presented', {
      metadata: {
        levelNumber,
        difficulty: levelDifficulty,
        completed: Boolean(levelCompletedAt),
      },
    });
  }, [levelNumber, levelDifficulty, levelCompletedAt]);

  const requiresReflection = typeof completionNote === 'string';
  const isCompletionReady = !requiresReflection || Boolean(completionNote && completionNote.trim().length >= 10);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return <Star className="h-4 w-4" />;
      case 'medium':
        return <Target className="h-4 w-4" />;
      case 'hard':
        return <Trophy className="h-4 w-4" />;
      case 'expert':
        return <Zap className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    
    try {
      const note = completionNote?.trim();
      if (requiresReflection && (!note || note.length < 10)) {
        toast.error('Reflection required', {
          description: 'Take a moment to note what you learned before completing the level.',
        });
        setIsCompleting(false);
        return;
      }

      const completeStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const response = await fetch('/api/levels/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          levelId: level.id,
          userResponse: note || 'Challenge completed successfully',
          completionNotes: requiresReflection ? note : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsCompleted(true);
        setCompletionSummary({
          rewards: data.rewards,
          aiFeedback: data.aiFeedback,
          completionNote: note || undefined,
        });
        toast.success('Level completed!', {
          description: `You earned ${data.rewards?.xp || level.xp_reward} XP and ${data.rewards?.coins || level.coin_reward} coins!`,
        });
        onComplete({ rewards: data.rewards, aiFeedback: data.aiFeedback, completionNote: note });
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - completeStart;
        trackLatency('level_complete_api', duration, true, {
          levelNumber: level.level_number,
        });
        trackJourneyEvent('level_completed_client', {
          success: true,
          metadata: {
            levelNumber: level.level_number,
            rewards: data.rewards,
          },
        });
      } else {
        // Parse error response
        const errorData = await response.json().catch(() => ({ error: 'Failed to complete level' }));
        const errorMessage = errorData.error || 'Failed to complete level';
        logger.error('Failed to complete level', { error: errorMessage });
        toast.error('Failed to complete level', {
          description: errorMessage,
        });
        trackLatency('level_complete_api', 0, false, {
          levelNumber: level.level_number,
          reason: errorMessage,
        });
        trackJourneyEvent('level_completed_client', {
          success: false,
          metadata: {
            levelNumber: level.level_number,
            reason: errorMessage,
          },
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Error completing level', { error: errorMessage });
      toast.error('Error completing level', {
        description: errorMessage,
      });
      trackLatency('level_complete_api', 0, false, {
        levelNumber: level.level_number,
        reason: errorMessage,
      });
      trackJourneyEvent('level_completed_client', {
        success: false,
        metadata: {
          levelNumber: level.level_number,
          reason: errorMessage,
        },
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSkip = async () => {
    if (!hasSkipToken) {
      toast.error('No level skip available', {
        description: 'Visit the shop to purchase a level skip token.',
      });
      return;
    }

    if (!confirm('Are you sure you want to skip this level? You will not earn XP or coins.')) {
      return;
    }

    setIsSkipping(true);
    try {
      const response = await fetch('/api/rewards/level-skip/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: level.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsCompleted(true);
        setHasSkipToken(false); // Token was consumed
        toast.success('Level skipped!', {
          description: `Advanced to level ${data.newLevel}`,
        });
        onComplete();
        trackJourneyEvent('level_skipped_client', {
          success: true,
          metadata: {
            levelNumber: level.level_number,
            newLevel: data.newLevel,
          },
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to skip level' }));
        toast.error('Failed to skip level', {
          description: errorData.error || 'Please try again',
        });
        trackJourneyEvent('level_skipped_client', {
          success: false,
          metadata: {
            levelNumber: level.level_number,
            reason: errorData.error,
          },
        });
      }
    } catch (error) {
      logger.error('Error skipping level', { error: error instanceof Error ? error.message : 'Unknown' });
      toast.error('Error skipping level', {
        description: 'Please try again later',
      });
      trackJourneyEvent('level_skipped_client', {
        success: false,
        metadata: {
          levelNumber: level.level_number,
          reason: error instanceof Error ? error.message : 'unknown',
        },
      });
    } finally {
      setIsSkipping(false);
    }
  };

  const isLocked = userTier === 'free' && level.level_number > 5;

  return (
    <Card className={`transition-all duration-200 ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-crave-orange/10 rounded-lg">
              {isCompleted ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : isLocked ? (
                <Lock className="h-6 w-6 text-gray-400" />
              ) : (
                <Target className="h-6 w-6 text-crave-orange" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">
                Level {level.level_number}: {level.title}
              </CardTitle>
              <CardDescription>
            {level.description}
          </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getDifficultyColor(level.difficulty)}>
              <div className="flex items-center space-x-1">
                {getDifficultyIcon(level.difficulty)}
                <span className="capitalize">{level.difficulty}</span>
              </div>
            </Badge>
            {isCompleted && (
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
            </CardHeader>

      <CardContent className="space-y-4">
        {/* Challenge Text */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Zap className="h-4 w-4 text-crave-orange" />
            <span>Today's Challenge</span>
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {level.challenge_text}
          </p>
        </div>

        {/* Rewards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Trophy className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{level.xp_reward} XP</p>
              <p className="text-xs text-muted-foreground">Experience</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Coins className="h-4 w-4 text-yellow-600" />
            </div>
                <div>
              <p className="text-sm font-medium">{level.coin_reward} Coins</p>
              <p className="text-xs text-muted-foreground">CraveCoins</p>
            </div>
          </div>
                </div>

        {/* Progress Indicator */}
        {!isCompleted && !isLocked && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>0%</span>
            </div>
            <Progress value={0} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Complete the challenge to earn rewards
            </p>
          </div>
        )}

        {/* Lock Message */}
        {isLocked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Premium Level
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Upgrade to Premium to unlock advanced levels
            </p>
                  </div>
                )}

        {/* Reflection Summary */}
        {isCompleted && completionSummary && (
          <div className="space-y-4">
            {completionSummary.completionNote && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-crave-orange" />
                  Your Reflection
                </h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                  {completionSummary.completionNote}
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">AI Feedback</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {completionSummary.aiFeedback || 'Keep up the great work! Detailed AI feedback will appear here soon.'}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {isCompleted ? (
            <>
              <Button disabled className="w-full bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed
              </Button>
              {onShare && (
                <Button variant="outline" className="w-full border-crave-orange text-crave-orange hover:bg-crave-orange hover:text-white" onClick={onShare}>
                  <Target className="h-4 w-4 mr-2" />
                  Share Your Win
                </Button>
              )}
            </>
          ) : isLocked ? (
            <Button disabled className="w-full bg-gray-100 text-gray-500">
              <Lock className="h-4 w-4 mr-2" />
              Locked
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleComplete}
                disabled={isCompleting || isSkipping || !isCompletionReady}
                className="w-full bg-crave-orange hover:bg-crave-orange-dark"
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4 mr-2" />
                    Complete Challenge
                  </>
                )}
              </Button>
              
              {!isCheckingSkip && hasSkipToken && (
                <Button
                  onClick={handleSkip}
                  disabled={isCompleting || isSkipping}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  {isSkipping ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                      Skipping...
                    </>
                  ) : (
                    <>
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip Level
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
            </CardContent>
          </Card>
  );
}