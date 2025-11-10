// Individual battle page with real-time progress
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sword,
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  Timer,
  Zap,
  Star,
  Crown,
} from 'lucide-react';

interface Battle {
  id: string;
  user1_name: string;
  user2_name: string;
  craving_type: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  winner_id?: string;
  user1_tasks_completed: number;
  user2_tasks_completed: number;
  created_at: string;
}

interface BattleTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xp_reward: number;
  coin_reward: number;
  completed: boolean;
  completed_at?: string;
}

export default function BattlePage() {
  const params = useParams();
  const battleId = params?.battleId as string;
  
  const [battle, setBattle] = useState<Battle | null>(null);
  const [tasks, setTasks] = useState<BattleTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const updateTimeRemaining = useCallback(() => {
    if (battle && battle.status === 'active' && battle.end_time) {
      const endTime = new Date(battle.end_time);
      const now = new Date();
      const diff = endTime.getTime() - now.getTime();
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining('Time up!');
      }
    }
  }, [battle]);

  const fetchBattleData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Add timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`/api/battles/${battleId}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setBattle(data.battle);
        setTasks(data.tasks || []);
        updateTimeRemaining();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Battle fetch timeout');
      } else {
        console.error('Error fetching battle data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [battleId, updateTimeRemaining]);

  useEffect(() => {
    fetchBattleData();
    
    // Update time remaining every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [battleId, fetchBattleData, updateTimeRemaining]);

  const handleTaskComplete = async (taskId: string) => {
    try {
      const response = await fetch('/api/battles/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          battleId,
          taskId,
        }),
      });

      if (response.ok) {
        fetchBattleData();
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <Sword className="h-4 w-4" />;
      case 'completed':
        return <Trophy className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getCravingIcon = (craving: string) => {
    const icons = {
      nofap: '🚫',
      sugar: '🍭',
      shopping: '🛍️',
      smoking_vaping: '🚭',
      social_media: '📱',
    };
    return icons[craving as keyof typeof icons] || '🌐';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Battle not found</h1>
          <p className="text-muted-foreground">This battle may have been deleted or doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">{getCravingIcon(battle.craving_type)}</span>
            <h1 className="text-3xl font-bold">
              {battle.craving_type.replace('_', ' ')} Battle
            </h1>
            <Badge className={getStatusColor(battle.status)}>
              {getStatusIcon(battle.status)}
              <span className="ml-1 capitalize">{battle.status}</span>
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-lg">
              <span className="font-semibold">{battle.user1_name}</span>
              <span className="mx-2 text-muted-foreground">vs</span>
              <span className="font-semibold">{battle.user2_name}</span>
            </div>
            
            {battle.status === 'active' && timeRemaining && (
              <div className="flex items-center space-x-2 text-crave-orange">
                <Timer className="h-5 w-5" />
                <span className="font-semibold">{timeRemaining}</span>
              </div>
            )}
          </div>
        </div>

        {/* Battle Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-crave-orange" />
              <span>Battle Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{battle.user1_name}</span>
                    <span>{battle.user1_tasks_completed}/3</span>
                  </div>
                  <Progress 
                    value={(battle.user1_tasks_completed / 3) * 100} 
                    className="h-2" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{battle.user2_name}</span>
                    <span>{battle.user2_tasks_completed}/3</span>
                  </div>
                  <Progress 
                    value={(battle.user2_tasks_completed / 3) * 100} 
                    className="h-2" 
                  />
                </div>
              </div>
              
              {battle.status === 'completed' && battle.winner_id && (
                <div className="p-4 bg-crave-orange/10 border border-crave-orange/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-crave-orange">
                    <Trophy className="h-5 w-5" />
                    <span className="font-semibold">
                      Winner: {battle.winner_id === 'user1' ? battle.user1_name : battle.user2_name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Battle Tasks */}
        {battle.status === 'active' && tasks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sword className="h-5 w-5 text-crave-orange" />
                <span>Battle Tasks</span>
              </CardTitle>
              <CardDescription>
                Complete these challenges to win the battle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <Card key={task.id} className={`${
                    task.completed ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-sm font-medium">Task {index + 1}</span>
                            <Badge className={getDifficultyColor(task.difficulty)}>
                              {task.difficulty}
                            </Badge>
                            {task.completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <h3 className="font-semibold mb-2">{task.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {task.description}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span className="flex items-center space-x-1">
                              <Zap className="h-3 w-3" />
                              <span>{task.xp_reward} XP</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Star className="h-3 w-3" />
                              <span>{task.coin_reward} Coins</span>
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          {task.completed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleTaskComplete(task.id)}
                              className="bg-crave-orange hover:bg-crave-orange-dark"
                            >
                              <Target className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Battle Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Crown className="h-5 w-5 text-crave-orange" />
              <span>Battle Rules</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">How to Win</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Complete all 3 tasks before time runs out</li>
                  <li>• Each task completed earns XP and CraveCoins</li>
                  <li>• Winner gets bonus rewards</li>
                  <li>• Both players must finish to determine winner</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Rewards</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 50 XP + 25 Coins per task</li>
                  <li>• +100 XP + 50 Coins for winning</li>
                  <li>• Battle completion badge</li>
                  <li>• Bragging rights in the community</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
