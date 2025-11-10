'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight } from 'lucide-react';

type ShopItem = {
  id: string;
  name: string;
  type: 'consumable' | 'utility' | 'cosmetic';
  price_coins: number;
  description?: string;
  icon?: string;
  tier_required: 'free' | 'plus' | 'plus_trial' | 'ultra';
};

interface ShopItemCardProps {
  item: ShopItem;
  userCoins: number;
  userTier: 'free' | 'plus' | 'plus_trial' | 'ultra';
  onPurchase: (itemId: string) => void;
  isPurchasing?: boolean;
}

export function ShopItemCard({ item, userCoins, userTier, onPurchase, isPurchasing = false }: ShopItemCardProps) {
  const router = useRouter();
  const insufficientCoins = userCoins < item.price_coins;
  const tierOrder = ['free', 'plus', 'plus_trial', 'ultra'] as const;
  const tierLocked = tierOrder.indexOf(userTier) < tierOrder.indexOf(item.tier_required);

  const handleUpgrade = () => {
    router.push(`/pricing?highlight=${item.tier_required}`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl">{item.icon || '🛒'}</span>
            {item.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{item.type}</Badge>
            {item.tier_required !== 'free' && (
              <Badge className="capitalize">{item.tier_required}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-yellow-700">{item.price_coins} coins</div>
            {tierLocked ? (
              <Button
                onClick={handleUpgrade}
                variant="outline"
                className="border-crave-orange text-crave-orange hover:bg-crave-orange hover:text-white"
              >
                Upgrade to {item.tier_required.charAt(0).toUpperCase() + item.tier_required.slice(1)}
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                disabled={isPurchasing || insufficientCoins}
                onClick={() => onPurchase(item.id)}
                className="bg-crave-orange hover:bg-crave-orange-dark"
              >
                {insufficientCoins ? 'Insufficient Coins' : isPurchasing ? 'Purchasing...' : 'Purchase'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



