'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  showNavigation?: boolean;
}

const navItems = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/levels/1', label: "Today's Level", icon: '🎯' },
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/forum', label: 'Forum', icon: '💬' },
  { href: '/battles', label: 'Battles', icon: '⚔️' },
  { href: '/shop', label: 'Rewards', icon: '🏆' },
  { href: '/progress/mock-user-123', label: 'Progress', icon: '📊' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

// Check if route is public (should not show navigation)
function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const publicRoutes = ['/', '/pricing', '/sign-in', '/sign-up'];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
}

export default function AppShell({ children, showNavigation }: AppShellProps) {
  const pathname = usePathname();
  
  // Determine if navigation should be shown
  // Hide navigation on public routes unless explicitly enabled
  const shouldShowNav = showNavigation !== undefined 
    ? showNavigation 
    : !isPublicRoute(pathname);

  const isActive = (href: string) => {
    if (href === '/levels/1') return pathname?.startsWith('/levels');
    return pathname === href;
  };

  // If navigation is hidden, render children without layout
  if (!shouldShowNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 border-r bg-white z-40">
        <nav className="mt-6 w-full px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-gray-50 ${isActive(item.href) ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content with sidebar space */}
      <div className="md:pl-56 pb-16">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white z-40">
        <div className="grid grid-cols-5 text-xs">
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center py-2 ${isActive(item.href) ? 'text-gray-900' : 'text-gray-500'}`}>
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}



