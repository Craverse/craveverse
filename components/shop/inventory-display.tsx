import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface InventoryEntry {
  id: string;
  itemName: string;
  itemType: 'consumable' | 'utility' | 'cosmetic' | string;
  quantity: number;
  effects: Record<string, any>;
  purchasedAt?: string;
  expiresAt?: string | null;
}

export interface PurchaseEntry {
  id: string;
  itemName: string;
  quantity: number;
  amountCoins: number;
  purchasedAt: string;
  itemType: string;
}

interface InventoryDisplayProps {
  inventory: InventoryEntry[];
  purchases: PurchaseEntry[];
  isInventoryLoading?: boolean;
  isPurchaseLoading?: boolean;
}

const SECTION_TITLES: Record<string, string> = {
  consumable: 'Consumables',
  utility: 'Utilities',
  cosmetic: 'Cosmetics',
};

function formatEffect(effects: Record<string, any>) {
  if (effects.pause_days) {
    return `${effects.pause_days}-day pause token`;
  }
  if (effects.level_skip) {
    return 'Level skip token';
  }
  if (effects.theme) {
    return `Theme unlock: ${effects.theme}`;
  }
  return 'Special item';
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString();
}

export function InventoryDisplay({
  inventory,
  purchases,
  isInventoryLoading,
  isPurchaseLoading,
}: InventoryDisplayProps) {
  const grouped = inventory.reduce<Record<string, InventoryEntry[]>>((acc, item) => {
    const bucket = item.itemType || 'other';
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(item);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Inventory</CardTitle>
          <CardDescription>Pause tokens, level skips, and cosmetic unlocks in your vault.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInventoryLoading && (
            <p className="text-sm text-muted-foreground">Loading inventory...</p>
          )}
          {!isInventoryLoading && inventory.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t purchased any rewards yet. Visit the shop to start building your toolkit.
            </p>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">
                  {SECTION_TITLES[type] ?? type.charAt(0).toUpperCase() + type.slice(1)}
                </h4>
                <Badge variant="secondary">{items.length} item(s)</Badge>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{item.itemName}</p>
                      <Badge>{item.quantity} in stock</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatEffect(item.effects)}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-2">
                      {item.purchasedAt && (
                        <span>Purchased {formatDate(item.purchasedAt)}</span>
                      )}
                      {item.expiresAt && (
                        <span>Expires {formatDate(item.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchases</CardTitle>
          <CardDescription>Track how you&apos;re spending CraveCoins across reward types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isPurchaseLoading && (
            <p className="text-sm text-muted-foreground">Loading purchase history...</p>
          )}
          {!isPurchaseLoading && purchases.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No purchases yet. Rewards, pause tokens, and themes will show here once you start shopping.
            </p>
          )}
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{purchase.itemName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(purchase.purchasedAt)}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="mb-1">
                  {purchase.itemType}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {purchase.quantity} × • {purchase.amountCoins} coins
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


