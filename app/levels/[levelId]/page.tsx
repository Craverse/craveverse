'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMemo } from 'react';
import { LevelCard } from '@/components/levels/level-card';

export const dynamic = 'force-dynamic';

const mockLevels = Array.from({ length: 30 }).map((_, i) => ({
  id: `level-${i + 1}`,
  level_number: i + 1,
  title: ['Mindful Awareness', 'Trigger Tracking', 'Routine Reset'][i % 3],
  description: 'A focused step in your 30-level journey.',
  challenge_text: 'Perform 10 minutes of mindful breathing when urges arise.',
  xp_reward: 100,
  coin_reward: 25,
  difficulty: i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard',
}));

export default function LevelDetailPage() {
  const router = useRouter();
  const params = useParams<{ levelId: string }>();
  const levelId = params?.levelId || '1';

  const level = useMemo(() => {
    const n = parseInt(String(levelId), 10);
    return mockLevels[Math.max(0, Math.min(29, isNaN(n) ? 0 : n - 1))];
  }, [levelId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</button>
          <div className="text-sm text-gray-500">Level {level.level_number} / 30</div>
        </div>
        <LevelCard 
          level={level}
          onComplete={() => router.push('/dashboard')}
          userTier={'free'}
        />
      </div>
    </div>
  );
}



