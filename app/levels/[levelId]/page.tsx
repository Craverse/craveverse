'use client';

import { useRouter, useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { LevelCard } from '@/components/levels/level-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const [reflectionNote, setReflectionNote] = useState('');
  const [completionResult, setCompletionResult] = useState<{
    rewards?: { xp?: number; coins?: number };
    aiFeedback?: string;
  } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const level = useMemo(() => {
    const n = parseInt(String(levelId), 10);
    return mockLevels[Math.max(0, Math.min(29, isNaN(n) ? 0 : n - 1))];
  }, [levelId]);
  const reflectionTooShort = reflectionNote.trim().length < 10;

  const handleCompletion = (result?: { rewards?: { xp?: number; coins?: number }; aiFeedback?: string; completionNote?: string } | null) => {
    if (!result) {
      router.push('/dashboard');
      return;
    }

    setCompletionResult(result);

    if (result) {
      const messageLines = [
        `I just completed Level ${level.level_number}: ${level.title}!`,
        result.rewards ? `Earned ${result.rewards.xp ?? 0} XP and ${result.rewards.coins ?? 0} CraveCoins.` : undefined,
        result.completionNote ? `Reflection: ${result.completionNote}` : undefined,
        'Join me on the CraveVerse journey! 🚀',
      ].filter(Boolean);
      const message = messageLines.join('\n');
      setShareMessage(message);
    }
  };

  const handleShare = async () => {
    if (!completionResult || !shareMessage) {
      toast.info('Complete the level first to share your win.');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareMessage,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        setShareOpen(true);
      }
    } else {
      setShareOpen(true);
    }
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Unable to copy. Please try manually.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-900">← Back to Dashboard</button>
          <div className="text-sm text-gray-500">Level {level.level_number} / 30</div>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reflection</CardTitle>
              <CardDescription>
                Take a moment to note what you learned or how you managed cravings during this challenge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={reflectionNote}
                onChange={(event) => setReflectionNote(event.target.value)}
                placeholder="Example: Practiced mindful breathing and noticed the urge pass after 3 minutes."
                className="min-h-[120px]"
                maxLength={400}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={reflectionTooShort ? 'text-red-500' : ''}>
                  {reflectionTooShort
                    ? `Add ${Math.max(0, 10 - reflectionNote.trim().length)} more characters`
                    : 'Reflection ready'}
                </span>
                <span>{reflectionNote.length}/400</span>
              </div>
            </CardContent>
          </Card>

          <LevelCard 
            level={level}
            onComplete={handleCompletion}
            userTier={'free'}
            completionNote={reflectionNote}
            onShare={handleShare}
          />

          {completionResult && (
            <Card>
              <CardHeader>
                <CardTitle>Level Summary</CardTitle>
                <CardDescription>
                  Great work! Here’s a snapshot of what you earned.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {completionResult.rewards && (
                  <div className="flex items-center justify-between">
                    <span>Rewards</span>
                    <span className="font-semibold text-gray-800">
                      {completionResult.rewards.xp ?? 0} XP • {completionResult.rewards.coins ?? 0} CraveCoins
                    </span>
                  </div>
                )}
                {completionResult.aiFeedback && (
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">AI Feedback</div>
                    <p className="whitespace-pre-wrap">{completionResult.aiFeedback}</p>
                  </div>
                )}
                <div className="pt-3">
                  <Button onClick={() => router.push('/dashboard')} className="bg-crave-orange hover:bg-crave-orange-dark w-full">
                    Continue to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Progress</DialogTitle>
            <DialogDescription>
              Copy the message below and share it with your accountability partners.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={shareMessage} readOnly className="min-h-[120px]" />
          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setShareOpen(false)}>Close</Button>
            <Button onClick={handleCopyShare}>Copy Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



