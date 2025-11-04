'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShopItemCard } from '@/components/shop/shop-item-card';
import { PurchaseModal } from '@/components/shop/purchase-modal';
import { useUserContext } from '@/contexts/user-context';
import { AuthGuard } from '@/components/auth-guard';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

type ShopItem = {
  id: string;
  name: string;
  type: 'consumable' | 'utility' | 'cosmetic';
  price_coins: number;
  description?: string;
  icon?: string;
  tier_required: 'free' | 'plus' | 'plus_trial' | 'ultra';
};

export default function ShopPage() {
  const { userProfile, refreshProfile } = useUserContext();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ShopItem | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'consumable' | 'utility' | 'cosmetic'>('all');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch('/api/shop/items');
        if (!res.ok) throw new Error('Failed to load items');
        const json = await res.json();
        setItems(json.items || []);
      } catch (e) {
        const errorMsg = 'Failed to load shop items';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.type === filter);
  }, [items, filter]);

  const userCoins = userProfile?.cravecoins ?? 0;
  const userTier = (userProfile?.subscription_tier ?? 'free') as 'free' | 'plus' | 'plus_trial' | 'ultra';

  const handlePurchase = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId) || null;
    setActiveItem(item);
  };

  const confirmPurchase = async () => {
    if (!activeItem) return;
    try {
      setIsPurchasing(true);
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: activeItem.id, quantity: 1 }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purchase failed');
      }
      const data = await res.json();
      // Refresh profile to update coin balance
      refreshProfile?.();
      setActiveItem(null);
      toast.success('Purchase successful!', {
        description: `${activeItem.name} has been added to your inventory.`,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Purchase failed. Please try again.';
      toast.error('Purchase failed', {
        description: errorMsg,
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Rewards Shop</h1>
          <div className="text-yellow-700 font-semibold">CraveCoins: {userCoins}</div>
        </div>

        <div className="mb-6 flex gap-2">
          {(['all', 'consumable', 'utility', 'cosmetic'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md border ${filter === f ? 'bg-crave-orange text-white border-crave-orange' : 'bg-white'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading && <div className="text-sm text-muted-foreground">Loading items...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              userCoins={userCoins}
              userTier={userTier}
              onPurchase={handlePurchase}
              isPurchasing={isPurchasing && activeItem?.id === item.id}
            />
          ))}
        </div>
      </div>

      <PurchaseModal
        isOpen={!!activeItem}
        item={activeItem}
        currentBalance={userCoins}
        onConfirm={confirmPurchase}
        onCancel={() => setActiveItem(null)}
        isProcessing={isPurchasing}
      />
    </div>
    </AuthGuard>
  );
}


