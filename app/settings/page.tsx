'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProfileForm } from '@/components/settings/profile-form';
import { NotificationSettings } from '@/components/settings/notification-settings';
import { ThemeSelector } from '@/components/settings/theme-selector';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>

        <ProfileForm />

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Current Plan: Free</div>
              <div className="text-sm text-muted-foreground">Upgrade for more features</div>
            </div>
            <Button variant="outline" asChild>
              <a href="/pricing">Upgrade</a>
            </Button>
          </CardContent>
        </Card>

        <ThemeSelector />

        <NotificationSettings />

        <Card>
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Need to delete your account? This feature is coming soon. Contact support if you need immediate assistance.
            </p>
            <Button variant="destructive" disabled>
              Delete Account (Coming soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


