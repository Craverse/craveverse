'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/contexts/user-context';
import { toast } from 'sonner';

interface ProfileState {
  name: string;
  email: string;
  avatar_url: string | null;
}

export function ProfileForm() {
  const { userProfile, refreshProfile } = useUserContext();
  const [profile, setProfile] = useState<ProfileState>({
    name: '',
    email: '',
    avatar_url: null,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setStatus('loading');
        const res = await fetch('/api/settings/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        setProfile({
          name: json.profile?.name ?? userProfile?.name ?? '',
          email: json.profile?.email ?? userProfile?.email ?? '',
          avatar_url: json.profile?.avatar_url ?? userProfile?.avatar_url ?? null,
        });
        setStatus('idle');
      } catch (error) {
        setStatus('error');
        const errorMsg = 'Unable to load profile settings.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    }
    loadProfile();
  }, [userProfile?.email, userProfile?.name, userProfile?.avatar_url]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setStatus('saving');
      setErrorMessage(null);
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, avatar_url: profile.avatar_url }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const json = await res.json();
      setProfile({
        name: json.profile?.name ?? profile.name,
        email: json.profile?.email ?? profile.email,
        avatar_url: json.profile?.avatar_url ?? profile.avatar_url,
      });
      refreshProfile?.();
      setStatus('saved');
      toast.success('Profile updated successfully!');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      const errorMsg = 'Failed to save changes. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                disabled={status === 'loading' || status === 'saving'}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
            </div>
          </div>
          <div>
            <Label htmlFor="avatar">Avatar URL</Label>
            <Input
              id="avatar"
              value={profile.avatar_url ?? ''}
              onChange={(event) => setProfile((prev) => ({ ...prev, avatar_url: event.target.value }))}
              placeholder="https://example.com/avatar.png"
              disabled={status === 'loading' || status === 'saving'}
            />
          </div>
          {status === 'error' && errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          {status === 'saved' && (
            <p className="text-sm text-green-600">Profile updated successfully.</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" className="bg-crave-orange hover:bg-crave-orange-dark" disabled={status === 'loading' || status === 'saving'}>
              {status === 'saving' ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}



