// Shareable progress page
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2, Download, Trophy, TrendingUp, Star } from 'lucide-react';
import { useUserContext } from '@/contexts/user-context';
import { ShareModal } from '@/components/progress/share-modal';
import { ProgressChart } from '@/components/progress/progress-chart';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

interface Activity {
  action: string;
  timestamp: string;
  details: string;
}

interface ProgressData {
  username: string;
  tier: string;
  xp: number;
  streak: number;
  levels_completed: number;
  craving_type: string | null;
  achievements: Achievement[];
  recent_activity: Activity[];
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    name: 'First Steps',
    description: 'Completed your first level',
    icon: '🎯',
    unlocked_at: new Date().toISOString(),
  },
];

const DEFAULT_ACTIVITY: Activity[] = [
  {
    action: 'Completed Level 1',
    timestamp: new Date().toISOString(),
    details: 'Mindful Awareness Challenge',
  },
];

export default function ProgressPage() {
  const params = useParams();
  const slug = params?.userId as string;
  const { userProfile, isLoading: ctxLoading } = useUserContext();

  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const isCurrentUser = useMemo(() => {
    if (!slug) return false;
    if (!userProfile) return slug === 'me';
    return slug === 'me' || slug === userProfile.id;
  }, [slug, userProfile]);

  useEffect(() => {
    async function loadProgress() {
      if (!slug) return;
      if (isCurrentUser) {
        if (ctxLoading) return;
        if (!userProfile) {
          setIsLoading(false);
          setProgressData(null);
          return;
        }
        setProgressData({
          username: userProfile.name,
          tier: userProfile.subscription_tier,
          xp: userProfile.xp,
          streak: userProfile.streak_count,
          levels_completed: Math.max(0, userProfile.current_level - 1),
          craving_type: userProfile.primary_craving,
          achievements: DEFAULT_ACHIEVEMENTS,
          recent_activity: DEFAULT_ACTIVITY,
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch(`/api/progress/${slug}`);
        if (!res.ok) {
          setProgressData(null);
        } else {
          const json = await res.json();
          const progress = json.progress || null;
          if (progress) {
            setProgressData({
              username: progress.username ?? 'CraveVerse Explorer',
              tier: progress.tier ?? 'free',
              xp: progress.xp ?? 0,
              streak: progress.streak ?? 0,
              levels_completed: progress.levels_completed ?? 0,
              craving_type: progress.craving_type ?? null,
              achievements: progress.achievements ?? DEFAULT_ACHIEVEMENTS,
              recent_activity: progress.recent_activity ?? DEFAULT_ACTIVITY,
            });
          } else {
            setProgressData(null);
          }
        }
      } catch {
        setProgressData(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, [slug, isCurrentUser, userProfile, ctxLoading]);

  const handleDownload = () => {
    if (!progressData) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 800;
    canvas.height = 600;
    ctx.fillStyle = '#101828';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fa9653';
    ctx.font = '36px Arial';
    ctx.fillText('CraveVerse Progress', 50, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(`${progressData.username}`, 50, 150);
    ctx.fillText(`Streak: ${progressData.streak} days`, 50, 190);
    ctx.fillText(`Levels Completed: ${progressData.levels_completed}`, 50, 230);
    const link = document.createElement('a');
    link.download = `${progressData.username}-progress.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return 'bg-yellow-100 text-yellow-800';
      case 'plus':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange" />
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Progress Not Found</h1>
          <p className="text-muted-foreground">This progress link may be expired or private.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{progressData.username}'s Progress</h1>
            <p className="text-muted-foreground">
              Journey to conquer {progressData.craving_type?.replace('_', ' ') || 'their cravings'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isCurrentUser && (
              <Button variant="outline" onClick={() => setShowShareModal(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Progress
              </Button>
            )}
            <Button className="bg-crave-orange hover:bg-crave-orange-dark" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download Card
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-crave-orange/10 flex items-center justify-center text-2xl font-bold">
              {progressData.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold">{progressData.username}</h2>
                <Badge className={getTierBadge(progressData.tier)}>{progressData.tier.toUpperCase()}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Stay consistent to unlock higher tiers and exclusive rewards.
              </p>
            </div>
          </CardContent>
        </Card>

        <ProgressChart
          xp={progressData.xp}
          streak={progressData.streak}
          levelsCompleted={progressData.levels_completed}
          totalLevels={30}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-crave-orange" />
                Achievements
              </CardTitle>
              <CardDescription>Milestones unlocked along the journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {progressData.achievements.map((achievement) => (
                  <div key={achievement.id} className="p-3 border rounded-lg flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <div className="font-semibold">{achievement.name}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-crave-orange" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest wins to celebrate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {progressData.recent_activity.map((activity, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="font-medium">{activity.action}</div>
                  <div className="text-sm text-muted-foreground">{activity.details}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed border-crave-orange/40 bg-crave-orange/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-crave-orange" />
              AI Weekly Summary (Coming soon)
            </CardTitle>
            <CardDescription>
              Personalized insights and next steps powered by AI will appear here in Stage 2.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              Stay tuned! This section will analyse your activity and recommend tailored actions once AI integrations are enabled.
            </div>
          </CardContent>
        </Card>
      </div>

      {isCurrentUser && (
        <ShareModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
        />
      )}
    </div>
  );
}


