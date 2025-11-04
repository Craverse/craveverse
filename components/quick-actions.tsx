// Quick actions component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Swords, ShoppingCart, Trophy, Crown } from 'lucide-react';

interface QuickActionsProps {
  userTier?: string;
}

export function QuickActions({ userTier }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full justify-start">
          <Link href="/forum">
            <MessageSquare className="h-4 w-4 mr-2" />
            Community Forum
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/battles">
            <Swords className="h-4 w-4 mr-2" />
            Start Battle
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/leaderboard">
            <Trophy className="h-4 w-4 mr-2" />
            Leaderboard
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/shop">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Rewards Shop
          </Link>
        </Button>
        
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/pricing">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}