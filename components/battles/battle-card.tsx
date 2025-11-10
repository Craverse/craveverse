'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sword,
  Trophy,
  Clock,
  Target,
  Users,
  Zap,
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

interface BattleCardProps {
  battle: Battle;
  onBattleUpdate?: () => void;
}

export function BattleCard({ battle, onBattleUpdate }: BattleCardProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <Zap className="h-4 w-4" />;
      case 'completed':
        return <Trophy className="h-4 w-4" />;
      case 'cancelled':
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressPercentage = () => {
    const totalTasks = 7; // Assuming 7 tasks per battle
    const user1Progress = (battle.user1_tasks_completed / totalTasks) * 100;
    const user2Progress = (battle.user2_tasks_completed / totalTasks) * 100;
    return { user1Progress, user2Progress };
  };

  const { user1Progress, user2Progress } = getProgressPercentage();

  const handleRefresh = () => {
    onBattleUpdate?.();
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getCravingIcon(battle.craving_type)}</span>
            <div>
              <CardTitle className="text-lg">
                {battle.user1_name} vs {battle.user2_name}
              </CardTitle>
              <CardDescription className="capitalize">
                {battle.craving_type.replace('_', ' ')} Challenge
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(battle.status)}>
            <div className="flex items-center space-x-1">
              {getStatusIcon(battle.status)}
              <span className="capitalize">{battle.status}</span>
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bars */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">{battle.user1_name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {battle.user1_tasks_completed}/7 tasks
            </span>
          </div>
          <Progress value={user1Progress} className="h-2" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{battle.user2_name}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {battle.user2_tasks_completed}/7 tasks
            </span>
          </div>
          <Progress value={user2Progress} className="h-2" />
        </div>

        {/* Battle Info */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Started</span>
            </div>
            <p className="text-xs font-medium">{formatDate(battle.start_time)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Ends</span>
            </div>
            <p className="text-xs font-medium">{formatDate(battle.end_time)}</p>
          </div>
        </div>

        {/* Winner Display */}
        {battle.status === 'completed' && battle.winner_id && (
          <div className="flex items-center justify-center space-x-2 p-3 bg-yellow-50 rounded-lg">
            <Crown className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Winner: {battle.winner_id === 'user1' ? battle.user1_name : battle.user2_name}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {battle.status === 'waiting' && (
            <Button
              size="sm"
              className="flex-1 bg-crave-orange hover:bg-crave-orange-dark"
              onClick={handleRefresh}
            >
              <Sword className="h-4 w-4 mr-1" />
              Join Battle
            </Button>
          )}
          {battle.status === 'active' && (
            <Button
              size="sm"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleRefresh}
            >
              <Target className="h-4 w-4 mr-1" />
              View Progress
            </Button>
          )}
          {battle.status === 'completed' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleRefresh}
            >
              <Trophy className="h-4 w-4 mr-1" />
              View Results
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}