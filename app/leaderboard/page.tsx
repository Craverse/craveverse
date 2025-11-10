// Leaderboard page for gamification
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trophy,
  Crown,
  Star,
  Flame,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: string;
  tier: string;
  xp: number;
  streak: number;
  battles_won: number;
  levels_completed: number;
  craving_type: string;
}

interface LeaderboardData {
  overall: LeaderboardEntry[];
  byCraving: Record<string, LeaderboardEntry[]>;
  streaks: LeaderboardEntry[];
  battles: LeaderboardEntry[];
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCraving, setSelectedCraving] = useState('all');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboardData(data.leaderboard);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'plus':
        return <Zap className="h-4 w-4 text-blue-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ultra':
        return 'bg-yellow-100 text-yellow-800';
      case 'plus':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crave-orange"></div>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Leaderboard Unavailable</h1>
          <p className="text-muted-foreground">Unable to load leaderboard data.</p>
        </div>
      </div>
    );
  }

  const cravingOptions = [
    { value: 'all', label: 'All Cravings', icon: '🌐' },
    { value: 'nofap', label: 'NoFap', icon: '🚫' },
    { value: 'sugar', label: 'Sugar Free', icon: '🍭' },
    { value: 'shopping', label: 'Shopping Control', icon: '🛍️' },
    { value: 'smoking_vaping', label: 'Smoke Free', icon: '🚭' },
    { value: 'social_media', label: 'Social Media Detox', icon: '📱' },
  ];

  const currentData = selectedCraving === 'all' 
    ? leaderboardData.overall 
    : leaderboardData.byCraving[selectedCraving] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">
            See how you stack up against other challengers
          </p>
        </div>

        {/* Craving Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {cravingOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedCraving === option.value ? 'default' : 'outline'}
                onClick={() => setSelectedCraving(option.value)}
                className="text-sm"
              >
                <span className="mr-2">{option.icon}</span>
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="overall" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overall">Overall</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="battles">Battles</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
          </TabsList>

          <TabsContent value="overall" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-crave-orange" />
                  <span>Overall Rankings</span>
                </CardTitle>
                <CardDescription>
                  Based on total XP and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.slice(0, 20).map((entry) => (
                    <div 
                      key={entry.rank}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        entry.rank <= 3 ? 'bg-crave-orange/5 border border-crave-orange/20' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-crave-orange/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold">{entry.username}</div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(entry.tier)}>
                                {getTierIcon(entry.tier)}
                                <span className="ml-1">{entry.tier.toUpperCase()}</span>
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {getCravingIcon(entry.craving_type)} {entry.craving_type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{entry.xp.toLocaleString()} XP</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.levels_completed} levels
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streaks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Flame className="h-5 w-5 text-crave-orange" />
                  <span>Longest Streaks</span>
                </CardTitle>
                <CardDescription>
                  Who's been consistent the longest
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboardData.streaks.slice(0, 20).map((entry) => (
                    <div 
                      key={entry.rank}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-crave-orange/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold">{entry.username}</div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(entry.tier)}>
                                {getTierIcon(entry.tier)}
                                <span className="ml-1">{entry.tier.toUpperCase()}</span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold flex items-center space-x-1">
                          <Flame className="h-4 w-4 text-crave-orange" />
                          <span>{entry.streak} days</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.xp.toLocaleString()} XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="battles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-crave-orange" />
                  <span>Battle Champions</span>
                </CardTitle>
                <CardDescription>
                  Most successful battle participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leaderboardData.battles.slice(0, 20).map((entry) => (
                    <div 
                      key={entry.rank}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-crave-orange/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold">{entry.username}</div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(entry.tier)}>
                                {getTierIcon(entry.tier)}
                                <span className="ml-1">{entry.tier.toUpperCase()}</span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold flex items-center space-x-1">
                          <Target className="h-4 w-4 text-crave-orange" />
                          <span>{entry.battles_won} wins</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.xp.toLocaleString()} XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="levels" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-crave-orange" />
                  <span>Level Masters</span>
                </CardTitle>
                <CardDescription>
                  Most levels completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData
                    .sort((a, b) => b.levels_completed - a.levels_completed)
                    .slice(0, 20)
                    .map((entry, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-crave-orange/20 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {entry.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold">{entry.username}</div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getTierColor(entry.tier)}>
                                {getTierIcon(entry.tier)}
                                <span className="ml-1">{entry.tier.toUpperCase()}</span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold flex items-center space-x-1">
                          <TrendingUp className="h-4 w-4 text-crave-orange" />
                          <span>{entry.levels_completed} levels</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.xp.toLocaleString()} XP
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}










