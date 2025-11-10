'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ButtonClickEvent {
  id: string;
  timestamp: string;
  pathname: string;
  buttonText: string;
  handler: string;
  target?: string;
  success: boolean;
  error?: string;
}

// Global button registry for testing
declare global {
  interface Window {
    buttonRegistry: {
      clicks: ButtonClickEvent[];
      getClicks: (filter?: string) => ButtonClickEvent[];
      clear: () => void;
      export: () => string;
    };
  }
}

export function ButtonRegistry({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clicksRef = useRef<ButtonClickEvent[]>([]);
  const lastSentRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const deriveButtonId = (element: HTMLElement, fallbackText: string) => {
      const dataId = element.getAttribute('data-button-id');
      if (dataId) return dataId;
      const elementId = element.getAttribute('id');
      if (elementId) return elementId;
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        return `aria-${ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
      }
      if (fallbackText) {
        return `text-${fallbackText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'button'}`;
      }
      return `anon-${element.tagName.toLowerCase()}`;
    };

    const sendInteraction = (payload: { pagePath: string; buttonId: string; buttonText: string; target?: string }) => {
      const key = `${payload.pagePath}::${payload.buttonId}`;
      const now = Date.now();
      const lastSent = lastSentRef.current[key] || 0;

      // Prevent flooding the API with identical rapid clicks (within 200ms)
      if (now - lastSent < 200) {
        return;
      }

      lastSentRef.current[key] = now;

      const body = JSON.stringify({
        pagePath: payload.pagePath,
        buttonId: payload.buttonId,
        buttonText: payload.buttonText,
        target: payload.target,
        metadata: {
          recordedAt: new Date().toISOString(),
        },
      });

      try {
        if (navigator && 'sendBeacon' in navigator) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon('/api/analytics/interaction', blob);
        } else {
          fetch('/api/analytics/interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {
            // swallow errors to avoid impacting UX
          });
        }
      } catch {
        // ignore - analytics should never break navigation
      }
    };

    // Initialize global registry
    if (typeof window !== 'undefined') {
      window.buttonRegistry = {
        clicks: clicksRef.current,
        getClicks: (filter?: string) => {
          if (filter) {
            return clicksRef.current.filter(c => c.pathname === filter || c.id === filter);
          }
          return [...clicksRef.current];
        },
        clear: () => {
          clicksRef.current = [];
          if (typeof window !== 'undefined' && window.buttonRegistry) {
            window.buttonRegistry.clicks = clicksRef.current;
          }
        },
        export: () => {
          return JSON.stringify(clicksRef.current, null, 2);
        },
      };
    }

    // Intercept all button clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find button element (could be button or link)
      let buttonElement: HTMLElement | null = target;
      while (buttonElement && buttonElement.tagName !== 'BUTTON' && buttonElement.tagName !== 'A') {
        buttonElement = buttonElement.parentElement;
      }

      if (buttonElement) {
        const buttonText = buttonElement.textContent?.trim() || '';
        const buttonId = deriveButtonId(buttonElement, buttonText);
        
        // Get handler info
        const onClick = buttonElement.getAttribute('onclick') || 
                       (buttonElement as any).onclick?.toString() || 
                       'unknown';
        
        // Get target (for links)
        const href = buttonElement.getAttribute('href') || 
                     (buttonElement as any).href || 
                     undefined;

        const clickEvent: ButtonClickEvent = {
          id: buttonId,
          timestamp: new Date().toISOString(),
          pathname: pathname || '/',
          buttonText,
          handler: onClick,
          target: href,
          success: true,
        };

        clicksRef.current.push(clickEvent);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔘 Button clicked:', {
            id: buttonId,
            text: buttonText,
            pathname,
            target: href,
          });
        }

        // Send analytics event asynchronously
        sendInteraction({
          pagePath: pathname || '/',
          buttonId,
          buttonText,
          target: href,
        });

        // Store in localStorage for persistence
        try {
          const stored = localStorage.getItem('buttonClicks') || '[]';
          const storedClicks = JSON.parse(stored);
          storedClicks.push(clickEvent);
          // Keep only last 100 clicks
          const recent = storedClicks.slice(-100);
          localStorage.setItem('buttonClicks', JSON.stringify(recent));
        } catch (error) {
          console.warn('Failed to store button click:', error);
        }
      }
    };

    // Add click listener
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [pathname]);

  return <>{children}</>;
}

