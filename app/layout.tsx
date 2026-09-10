import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'SubTrack',
  description: 'A private, intelligent home for every subscription you pay for.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AnalyticsTracker />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

