'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface NotificationState {
  email_enabled: boolean;
  push_enabled: boolean;
  daily_reminder_time: string;
}

export function NotificationSettings() {
  const [state, setState] = useState<NotificationState>({
    email_enabled: true,
    push_enabled: false,
    daily_reminder_time: '09:00',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      try {
        setStatus('loading');
        const res = await fetch('/api/settings/notifications');
        if (!res.ok) throw new Error('Failed to load notification settings');
        const json = await res.json();
        setState({
          email_enabled: json.preferences?.email_enabled ?? true,
          push_enabled: json.preferences?.push_enabled ?? false,
          daily_reminder_time: json.preferences?.daily_reminder_time ?? '09:00',
        });
        setStatus('idle');
      } catch {
        setStatus('error');
        const errorMsg = 'Unable to load notification settings.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    }
    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setStatus('saving');
      setErrorMessage(null);
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error('Failed to update notification settings');
      setStatus('saved');
      toast.success('Notification preferences updated successfully!');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      const errorMsg = 'Failed to save preferences. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Email notifications</h3>
            <p className="text-sm text-muted-foreground">Receive daily summaries and progress updates.</p>
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={state.email_enabled}
              onChange={(event) => setState((prev) => ({ ...prev, email_enabled: event.target.checked }))}
              disabled={status === 'loading' || status === 'saving'}
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Push notifications</h3>
            <p className="text-sm text-muted-foreground">Mobile push notifications (coming soon).</p>
          </div>
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-4 w-4" checked={state.push_enabled} disabled />
            <span className="text-sm">Coming soon</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="reminder-time">Daily reminder time</Label>
            <Input
              id="reminder-time"
              type="time"
              value={state.daily_reminder_time}
              onChange={(event) => setState((prev) => ({ ...prev, daily_reminder_time: event.target.value }))}
              disabled={status === 'loading' || status === 'saving'}
            />
          </div>
        </div>

        {status === 'error' && errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        {status === 'saved' && (
          <p className="text-sm text-green-600">Notification preferences updated.</p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-crave-orange hover:bg-crave-orange-dark" disabled={status === 'loading' || status === 'saving'}>
            {status === 'saving' ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


