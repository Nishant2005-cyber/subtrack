import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'SubTrack — Subscription tracker', description: 'A private home for every subscription you pay for.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
