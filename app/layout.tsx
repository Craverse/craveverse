// Root layout for the application
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import AppShell from '@/components/app-shell';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

// Force all pages to be dynamic - prevents static generation during build
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CraveVerse - Conquer Your Cravings',
  description: 'Transform your life by conquering your cravings with our 30-day journey system.',
  keywords: ['addiction recovery', 'habit breaking', 'self improvement', 'craving control'],
  authors: [{ name: 'CraveVerse Team' }],
  openGraph: {
    title: 'CraveVerse - Conquer Your Cravings',
    description: 'Transform your life by conquering your cravings with our 30-day journey system.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CraveVerse - Conquer Your Cravings',
    description: 'Transform your life by conquering your cravings with our 30-day journey system.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
        <Toaster position="top-right" />
        {/* <PerformanceMonitor /> */}
      </body>
    </html>
  );
}
