// Dashboard stats component
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Target, TrendingUp, Coins } from 'lucide-react';

interface DashboardStatsProps {
  streak: number;
  currentLevel: number;
  totalXP: number;
  totalCoins: number;
  maxLevel: number;
}

export function DashboardStats({
  streak,
  currentLevel,
  totalXP,
  totalCoins,
  maxLevel,
}: DashboardStatsProps) {
  const levelProgress = (currentLevel / maxLevel) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Streak */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-crave-orange/10 rounded-lg">
              <Flame className="h-6 w-6 text-crave-orange" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold">{streak} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Level Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Level Progress</p>
              <p className="text-2xl font-bold">{currentLevel}/{maxLevel}</p>
              <Progress value={levelProgress} className="mt-2 h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total XP */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total XP</p>
              <p className="text-2xl font-bold">{totalXP}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CraveCoins */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Coins className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">CraveCoins</p>
              <p className="text-2xl font-bold">{totalCoins}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
