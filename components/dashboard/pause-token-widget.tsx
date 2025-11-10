'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLogger } from '@/lib/logger';
import { Pause, Play, Clock } from 'lucide-react';

interface InventoryItem {
  id: string;
  itemId: string;
  itemName: string;
  itemType: string;
  quantity: number;
  effects: Record<string, any>;
  icon?: string;
}

interface ActivePause {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
}

export function PauseTokenWidget() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePause, setActivePause] = useState<ActivePause | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<InventoryItem | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(1);
  const logger = useLogger('PauseTokenWidget');
  const lastInventoryFetchRef = useRef<number>(0);
  const lastActiveFetchRef = useRef<number>(0);

  const fetchInventory = useCallback(async () => {
    const now = Date.now();
    if (now - lastInventoryFetchRef.current < 5000) {
      return;
    }
    lastInventoryFetchRef.current = now;
    try {
      setIsLoading(true);
      const response = await fetch('/api/rewards/inventory');
      if (response.ok) {
        const data = await response.json();
        const pauseTokens = (data.inventory || []).filter(
          (item: InventoryItem) => item.effects?.pause_days
        );
        setInventory(pauseTokens);
      } else {
        logger.error('Failed to fetch inventory', { status: response.status });
      }
    } catch (error) {
      logger.error('Error fetching inventory', { error: error instanceof Error ? error.message : 'Unknown' });
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  const fetchActivePause = useCallback(async () => {
    const now = Date.now();
    if (now - lastActiveFetchRef.current < 5000) {
      return;
    }
    lastActiveFetchRef.current = now;
    try {
      const response = await fetch('/api/rewards/pause-token/active', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setActivePause(data.pause ?? null);
      } else if (response.status === 404) {
        setActivePause(null);
      }
    } catch (error) {
      logger.error('Error checking active pause', { error: error instanceof Error ? error.message : 'Unknown' });
    }
  }, [logger]);

  useEffect(() => {
    fetchInventory();
    fetchActivePause();
  }, [fetchInventory, fetchActivePause]);

  const handleActivate = async () => {
    if (!selectedToken) return;

    setIsActivating(true);
    try {
      const response = await fetch('/api/rewards/pause-token/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: selectedToken.id,
          days: selectedDays,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setActivePause(data.pausePeriod);
        setIsModalOpen(false);
        toast.success('Pause token activated!', {
          description: `Your streak is protected until ${new Date(data.pausePeriod.endDate).toLocaleDateString()}`,
        });
        lastInventoryFetchRef.current = 0;
        lastActiveFetchRef.current = 0;
        await fetchInventory(); // Refresh inventory
        await fetchActivePause();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to activate pause token' }));
        toast.error('Failed to activate pause token', {
          description: errorData.error || 'Please try again',
        });
      }
    } catch (error) {
      logger.error('Error activating pause token', { error: error instanceof Error ? error.message : 'Unknown' });
      toast.error('Error activating pause token', {
        description: 'Please try again later',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const openActivateModal = (token: InventoryItem) => {
    const pauseDays = token.effects?.pause_days;
    if (pauseDays) {
      setSelectedToken(token);
      setSelectedDays(pauseDays);
      setIsModalOpen(true);
    }
  };

  const pauseTokens1Day = inventory.filter(item => item.effects?.pause_days === 1);
  const pauseTokens3Day = inventory.filter(item => item.effects?.pause_days === 3);
  const totalTokens = pauseTokens1Day.reduce((sum, item) => sum + item.quantity, 0) +
                     pauseTokens3Day.reduce((sum, item) => sum + item.quantity, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalTokens === 0 && !activePause) {
    return null; // Don't show widget if no tokens and no active pause
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5 text-crave-orange" />
            Pause Tokens
          </CardTitle>
          <CardDescription>
            Protect your streak when you need a break
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activePause && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Active Pause</span>
              </div>
              <p className="text-xs text-green-700">
                Your streak is protected until{' '}
                <strong>{new Date(activePause.endDate).toLocaleDateString()}</strong>
              </p>
            </div>
          )}

          {totalTokens > 0 && (
            <div className="space-y-2">
              {pauseTokens1Day.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏸️</span>
                    <div>
                      <p className="text-sm font-medium">1-Day Token</p>
                      <p className="text-xs text-muted-foreground">
                        {pauseTokens1Day.reduce((sum, item) => sum + item.quantity, 0)} available
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openActivateModal(pauseTokens1Day[0])}
                    disabled={!!activePause}
                    className="bg-crave-orange hover:bg-crave-orange-dark"
                  >
                    Use
                  </Button>
                </div>
              )}

              {pauseTokens3Day.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏸️</span>
                    <div>
                      <p className="text-sm font-medium">3-Day Token</p>
                      <p className="text-xs text-muted-foreground">
                        {pauseTokens3Day.reduce((sum, item) => sum + item.quantity, 0)} available
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openActivateModal(pauseTokens3Day[0])}
                    disabled={!!activePause}
                    className="bg-crave-orange hover:bg-crave-orange-dark"
                  >
                    Use
                  </Button>
                </div>
              )}
            </div>
          )}

          {totalTokens === 0 && !activePause && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No pause tokens available. Visit the shop to purchase more.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Pause Token</DialogTitle>
            <DialogDescription>
              Activate a {selectedDays}-day pause token to protect your streak from breaking.
              During this period, your streak will not be lost even if you miss a day.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Pause Period</p>
                  <p className="text-xs text-blue-700">
                    {new Date().toLocaleDateString()} - {new Date(Date.now() + selectedDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isActivating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={isActivating}
              className="bg-crave-orange hover:bg-crave-orange-dark"
            >
              {isActivating ? 'Activating...' : 'Activate Pause'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

