'use client';

import { useEffect, useState } from 'react';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting({ name }: { name?: string | null }) {
  const [greeting, setGreeting] = useState<string>(getTimeBasedGreeting);

  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    const interval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="font-serif text-3xl tracking-tight sm:text-4xl" suppressHydrationWarning>
      {greeting}{name ? `, ${name}` : ''}
    </h1>
  );
}
