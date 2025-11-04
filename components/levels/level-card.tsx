'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Trophy, 
  Coins, 
  Zap,
  Clock,
  Star,
  CheckCircle,
  Lock
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

interface LevelCardProps {
  level: Level;
  onComplete: () => void;
  userTier: string;
}

export function LevelCard({ level, onComplete, userTier }: LevelCardProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(!!level.completed_at);

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
      const response = await fetch('/api/levels/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ levelId: level.id }),
      });

      if (response.ok) {
        setIsCompleted(true);
        onComplete();
      } else {
        console.error('Failed to complete level');
      }
    } catch (error) {
      console.error('Error completing level:', error);
    } finally {
      setIsCompleting(false);
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

        {/* AI Feedback Section */}
        {isCompleted && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-400 mb-2">API</div>
              <div className="text-sm text-gray-500" title="AI integration coming in Stage 2">
                AI feedback on your completion
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {isCompleted ? (
            <Button disabled className="w-full bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </Button>
          ) : isLocked ? (
            <Button disabled className="w-full bg-gray-100 text-gray-500">
              <Lock className="h-4 w-4 mr-2" />
              Locked
                  </Button>
          ) : (
            <Button 
              onClick={handleComplete}
              disabled={isCompleting}
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
                  )}
              </div>
            </CardContent>
          </Card>
  );
}