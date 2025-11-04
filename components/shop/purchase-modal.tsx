'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ShopItem = {
  id: string;
  name: string;
  price_coins: number;
  icon?: string;
};

interface PurchaseModalProps {
  isOpen: boolean;
  item: ShopItem | null;
  currentBalance: number;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function PurchaseModal({ isOpen, item, currentBalance, onConfirm, onCancel, isProcessing = false }: PurchaseModalProps) {
  const cost = item?.price_coins ?? 0;
  const newBalance = currentBalance - cost;

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{item?.icon || '🛒'}</div>
            <div>
              <div className="font-semibold">{item?.name}</div>
              <div className="text-sm text-muted-foreground">{cost} coins</div>
            </div>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between">
              <span>Current balance</span>
              <span className="font-medium">{currentBalance} coins</span>
            </div>
            <div className="flex justify-between">
              <span>Cost</span>
              <span className="font-medium">-{cost} coins</span>
            </div>
            <div className="border-t my-2" />
            <div className="flex justify-between">
              <span>New balance</span>
              <span className="font-medium">{newBalance} coins</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancel</Button>
            <Button className="bg-crave-orange hover:bg-crave-orange-dark" onClick={() => onConfirm()} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



