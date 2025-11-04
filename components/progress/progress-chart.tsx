'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressChartProps {
  xp: number;
  streak: number;
  levelsCompleted: number;
  totalLevels: number;
}

export function ProgressChart({ xp, streak, levelsCompleted, totalLevels }: ProgressChartProps) {
  const levelPercent = Math.min(100, Math.round((levelsCompleted / Math.max(totalLevels, 1)) * 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Lifetime XP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{xp}</p>
          <p className="text-sm text-muted-foreground">Total experience earned across your journey.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Streak</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{streak} days</p>
          <p className="text-sm text-muted-foreground">Keep the momentum going with daily wins.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Levels Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{levelsCompleted} / {totalLevels}</span>
            <span>{levelPercent}%</span>
          </div>
          <Progress value={levelPercent} />
          <p className="text-sm text-muted-foreground">Complete levels to unlock new rewards and challenges.</p>
        </CardContent>
      </Card>
    </div>
  );
}



