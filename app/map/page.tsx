'use client';

import { useEffect, useState } from 'react';
import { LevelNode } from '@/components/map/level-node';
import { ProgressPath } from '@/components/map/progress-path';
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

  useEffect(() => {
    async function fetchLevels() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/map/levels');
        if (!res.ok) throw new Error('Failed to load levels');
        const json = await res.json();
        setLevels(json.levels || []);
      } catch (err) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Crave Map</h1>
          <p className="text-muted-foreground">
            Track your journey across 30 levels tailored to your primary craving.
          </p>
        </div>

        <ProgressPath completed={completedCount} total={levels.length || 30} />

        {isLoading && <div className="text-sm text-muted-foreground">Loading map...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

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

