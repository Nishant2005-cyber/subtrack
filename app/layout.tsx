import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { ThemeProvider, ThemeScript } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SubTrack',
  description: 'A private, intelligent home for every subscription you pay for.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AnalyticsTracker />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
