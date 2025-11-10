'use client';

import { useEffect, useMemo, useState } from 'react';
import { LevelNode } from '@/components/map/level-node';
import { ProgressPath } from '@/components/map/progress-path';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUserContext } from '@/contexts/user-context';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

interface LevelStatus {
  id: string;
  level_number: number;
  title: string;
  status: 'completed' | 'current' | 'locked';
}

export default function MapPage() {
  const [levels, setLevels] = useState<LevelStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useUserContext();

  useEffect(() => {
    async function fetchLevels() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/map/levels');
        if (!res.ok) throw new Error('Failed to load levels');
        const json = await res.json();
        setLevels(json.levels || []);
      } catch {
        const errorMsg = 'Unable to load map data.';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLevels();
  }, []);

  const completedCount = levels.filter((level) => level.status === 'completed').length;
  const currentLevelInfo = levels.find((level) => level.status === 'current');
  const totalLevels = levels.length || 30;
  const currentLevelNumber = userProfile?.current_level ?? currentLevelInfo?.level_number ?? completedCount + 1;
  const streakCount = userProfile?.streak_count ?? Math.max(1, completedCount);
  const projectedCompletionDate = useMemo(() => {
    const remaining = Math.max(0, 30 - completedCount);
    const date = new Date();
    date.setDate(date.getDate() + remaining);
    return date;
  }, [completedCount]);
  const streakMessage =
    streakCount >= 30
      ? 'Legendary streak! Momentum is unstoppable.'
      : streakCount >= 7
        ? 'Weekly streak intact. Keep stacking wins!'
        : 'Every win counts. Stay consistent.';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Crave Map</h1>
          <p className="text-muted-foreground">
            Track your journey across 30 levels tailored to your primary craving.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Journey Snapshot</CardTitle>
            <CardDescription>
              See where you are today and when you&apos;ll cross the finish line.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-gray-900">
                {completedCount}/{totalLevels} levels
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Challenge</p>
              <p className="text-lg font-semibold text-gray-900">
                Level {currentLevelNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {streakMessage}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected Completion</p>
              <p className="text-lg font-semibold text-gray-900">
                {projectedCompletionDate.toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Stay on your pace to finish in {Math.max(0, 30 - completedCount)} day(s).
              </p>
            </div>
          </CardContent>
        </Card>

        <ProgressPath completed={completedCount} total={levels.length || 30} />

        {isLoading && <div className="text-sm text-muted-foreground">Loading map...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!isLoading && levels.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Map data isn&apos;t available yet. Complete onboarding to unlock your journey or refresh the page to try again.
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {levels.map((level) => (
            <LevelNode
              key={level.id}
              levelNumber={level.level_number}
              title={level.title}
              status={level.status}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

