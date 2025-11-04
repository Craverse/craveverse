'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: (url: string) => void;
}

export function ShareModal({ open, onOpenChange, onShare }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const generateLink = async () => {
    try {
      setStatus('loading');
      const res = await fetch('/api/progress/generate', { method: 'POST' });
      if (!res.ok) throw new Error('Request failed');
      const json = await res.json();
      setShareUrl(json.url);
      onShare?.(json.url);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your progress</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate a shareable link to show your progress with friends and accountability partners.
          </p>
          <div className="space-y-2">
            <Button className="bg-crave-orange hover:bg-crave-orange-dark" onClick={generateLink} disabled={status === 'loading'}>
              {status === 'loading' ? 'Generating...' : 'Generate share link'}
            </Button>
            {status === 'error' && <p className="text-sm text-red-600">Something went wrong. Please try again.</p>}
          </div>
          {shareUrl && (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Share link</label>
                <Input value={shareUrl} readOnly />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyToClipboard}>Copy link</Button>
                <Button variant="outline" asChild>
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out my CraveVerse progress!')}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">
                    Share on X
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">
                    Share on Facebook
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



