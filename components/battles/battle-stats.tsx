'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Target,
  Flame,
  Crown,
} from 'lucide-react';

interface BattleStatsProps {
  stats: {
    totalBattles: number;
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
  };
}

export function BattleStats({ stats }: BattleStatsProps) {
  const getWinRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-blue-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-purple-600';
    if (streak >= 5) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Battles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Battles
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBattles}</div>
          <p className="text-xs text-muted-foreground">
            All-time battles fought
          </p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Win Rate
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getWinRateColor(stats.winRate)}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="mt-2">
            <Progress value={stats.winRate} className="h-2" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.wins} wins, {stats.losses} losses
          </p>
        </CardContent>
      </Card>

      {/* Current Streak */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Streak
          </CardTitle>
          <Flame className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getStreakColor(stats.currentStreak)}`}>
            {stats.currentStreak}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.currentStreak > 0 ? 'Wins in a row' : 'No active streak'}
          </p>
        </CardContent>
      </Card>

      {/* Best Streak */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Best Streak
          </CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {stats.bestStreak}
          </div>
          <p className="text-xs text-muted-foreground">
            Longest winning streak
          </p>
        </CardContent>
      </Card>
    </div>
  );
}