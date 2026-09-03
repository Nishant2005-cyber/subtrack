import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Cycle } from './types';

export const categoryLabel = (category: string) => category.replace(/\b\w/g, (letter) => letter.toUpperCase());
export const currency = (amount: number, code = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(amount);
export const monthlyCost = (cost: number, cycle: Cycle) => cycle === 'yearly' ? cost / 12 : cost;
export const daysUntil = (date: string) => differenceInCalendarDays(parseISO(date), new Date());
export const dateLabel = (date: string) => format(parseISO(date), 'd MMM');
export const getTodayDateStr = () => format(new Date(), 'yyyy-MM-dd');
export function dueLabel(date: string) { const days = daysUntil(date); return days < 0 ? 'Past due' : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`; }
