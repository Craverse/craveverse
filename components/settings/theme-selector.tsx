'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLogger } from '@/lib/logger';
import { Palette, Sparkles, Check } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  unlockedAt: string;
  themeData: {
    colorScheme?: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
    };
    motivationalQuotes?: string[];
    badges?: string[];
  };
}

export function ThemeSelector() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const logger = useLogger('ThemeSelector');

  const fetchThemes = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/rewards/themes');
      if (response.ok) {
        const data = await response.json();
        setThemes(data.themes || []);
      } else {
        logger.error('Failed to fetch themes', { status: response.status });
      }
    } catch (error) {
      logger.error('Error fetching themes', { error: error instanceof Error ? error.message : 'Unknown' });
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  const fetchActiveTheme = useCallback(async () => {
    try {
      const response = await fetch('/api/user/settings');
      if (response.ok) {
        const data = await response.json();
        setActiveTheme(data.activeThemeId || null);
      }
    } catch (error) {
      logger.warn('Error fetching active theme', { error: error instanceof Error ? error.message : 'Unknown' });
    }
  }, [logger]);

  useEffect(() => {
    fetchThemes();
    fetchActiveTheme();
  }, [fetchThemes, fetchActiveTheme]);

  const handleApplyTheme = async (themeId: string) => {
    setIsApplying(themeId);
    try {
      const response = await fetch('/api/rewards/theme/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        setActiveTheme(themeId);
        toast.success('Theme applied!', {
          description: 'Your dashboard now uses the new theme.',
        });
        // Reload page to apply theme styles
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to apply theme' }));
        toast.error('Failed to apply theme', {
          description: errorData.error || 'Please try again',
        });
      }
    } catch (error) {
      logger.error('Error applying theme', { error: error instanceof Error ? error.message : 'Unknown' });
      toast.error('Error applying theme', {
        description: 'Please try again later',
      });
    } finally {
      setIsApplying(null);
    }
  };

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

  if (themes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-crave-orange" />
            Themes
          </CardTitle>
          <CardDescription>Unlock themes from the shop to customize your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No themes unlocked yet. Visit the shop to purchase themes!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-crave-orange" />
          Themes
        </CardTitle>
        <CardDescription>Personalized themes based on your journey</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {themes.map((theme) => {
          const isActive = activeTheme === theme.id;
          const colorScheme = theme.themeData?.colorScheme;
          const primaryColor = colorScheme?.primary || '#FF8C42';

          return (
            <div
              key={theme.id}
              className={`border rounded-lg p-4 transition-all ${
                isActive ? 'border-crave-orange bg-orange-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold capitalize">{theme.id.replace('_', ' ')}</h3>
                      {isActive && (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Exclusive
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unlocked {new Date(theme.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleApplyTheme(theme.id)}
                  disabled={isActive || isApplying === theme.id}
                  variant={isActive ? 'outline' : 'default'}
                  className={isActive ? '' : 'bg-crave-orange hover:bg-crave-orange-dark'}
                >
                  {isApplying === theme.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Applying...
                    </>
                  ) : isActive ? (
                    'Active'
                  ) : (
                    'Apply Theme'
                  )}
                </Button>
              </div>

              {theme.themeData?.badges && theme.themeData.badges.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {theme.themeData.badges.map((badge, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}

              {theme.themeData?.motivationalQuotes && theme.themeData.motivationalQuotes.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs italic text-muted-foreground">
                  "{theme.themeData.motivationalQuotes[0]}"
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

