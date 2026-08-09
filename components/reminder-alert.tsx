'use client';

import { useTransition } from 'react';
import { Check, Clock3 } from 'lucide-react';
import { acknowledgeNotification } from '@/app/actions';

export function ReminderAlert({ id, title, body }: { id: string; title: string; body: string }) {
  const [pending,start]=useTransition(); return <div className="rounded-xl bg-orange-50 p-4"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-200 text-orange-800"><Clock3 size={16}/></span><div><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-5 text-stone-600">{body}</p></div></div><button disabled={pending} onClick={()=>start(async()=>{try{await acknowledgeNotification(id)}catch{alert('Could not acknowledge this reminder.')}})} className="action mt-3 bg-white text-stone-700 shadow-sm disabled:opacity-50"><Check size={13}/>{pending?'Saving…':'Got it'}</button></div>;
}
