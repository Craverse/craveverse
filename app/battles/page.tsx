// Battles page with matchmaking and battle list
'use client';

// Force dynamic rendering for auth-protected page
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sword, 
  Trophy, 
  Zap,
} from 'lucide-react';
import { BattleCard } from '../../components/battles/battle-card';
import { CreateBattleModal } from '../../components/battles/create-battle-modal';
import { BattleStats } from '../../components/battles/battle-stats';
import { useLogger } from '@/lib/logger';
import { toast } from 'sonner';

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

interface BattleStats {
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
}

export default function BattlesPage() {
  const logger = useLogger('BattlesPage');
  const [activeBattles, setActiveBattles] = useState<Battle[]>([]);
  const [completedBattles, setCompletedBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [stats, setStats] = useState<BattleStats | null>(null);

  const fetchBattles = useCallback(async () => {
    try {
      setIsLoading(true);
      // Add timeout with AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/battles', {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setActiveBattles(data.activeBattles || []);
        setCompletedBattles(data.completedBattles || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load battles' }));
        logger.error('Error fetching battles', { error: errorData.error });
        toast.error('Failed to load battles', {
          description: errorData.error || 'Please try refreshing the page.',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn('Battles fetch timeout');
        toast.error('Request timeout', {
          description: 'Loading battles took too long. Please try again.',
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error fetching battles', { error: errorMessage });
        toast.error('Error loading battles', {
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/battles/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      logger.error('Error fetching stats', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [logger]);

  useEffect(() => {
    fetchBattles();
    fetchStats();
  }, [fetchBattles, fetchStats]);

  const handleBattleCreated = async () => {
    try {
      await fetchBattles();
      setIsCreateModalOpen(false);
      toast.success('Battle created successfully!');
    } catch (error) {
      logger.error('Failed to refresh battles after creation', { error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error('Battle created but failed to refresh list', {
        description: 'Please refresh the page to see your new battle.',
      });
      setIsCreateModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">1v1 Battles</h1>
              <p className="text-muted-foreground">
                Challenge others and prove your strength
              </p>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-crave-orange hover:bg-crave-orange-dark"
            >
              <Sword className="h-4 w-4 mr-2" />
              Start Battle
            </Button>
          </div>
        </div>

        {/* AI Challenge Generation Section */}
        <Card className="border-crave-orange/20 bg-crave-orange/5 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-crave-orange" />
              <span>AI Challenge Generator</span>
            </CardTitle>
            <CardDescription>
              Generate personalized battle challenges using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* AI PLACEHOLDER: Battle challenge generation - AI integration coming in Stage 2 */}
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-400 mb-2">API</div>
                <div className="text-sm text-gray-500" title="AI integration coming in Stage 2">
                  AI-powered battle challenge generation
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <BattleStats stats={stats} />
        )}

        {/* Battle Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Battles</TabsTrigger>
            <TabsTrigger value="completed">Battle History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange"></div>
              </div>
            ) : activeBattles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBattles.map((battle) => (
                  <BattleCard 
                    key={battle.id} 
                    battle={battle} 
                    onBattleUpdate={fetchBattles}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sword className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active battles</h3>
                  <p className="text-muted-foreground mb-4">
                    Start a new battle to challenge others!
                  </p>
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-crave-orange hover:bg-crave-orange-dark"
                  >
                    <Sword className="h-4 w-4 mr-2" />
                    Start Your First Battle
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crave-orange"></div>
              </div>
            ) : completedBattles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedBattles.map((battle) => (
                  <BattleCard 
                    key={battle.id} 
                    battle={battle} 
                    onBattleUpdate={fetchBattles}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed battles</h3>
                  <p className="text-muted-foreground mb-4">
                    Complete some battles to see your history here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Battle Modal */}
        <CreateBattleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onBattleCreated={handleBattleCreated}
        />
      </div>
    </div>
  );
}
