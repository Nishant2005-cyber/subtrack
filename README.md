# SubTrack

A full-stack subscription tracker built with Next.js 14, Supabase, Resend, Twilio, TMDB, and Vercel Cron. It deliberately sends users to a service's own renewal or cancellation page; it never handles third-party credentials or payments.

## Run locally

1. Create a Supabase project and run `supabase/migrations/001_initial.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and add the Supabase URL and anon key. Add the service role key and integrations to enable scheduled notifications and content suggestions.
3. Run `npm install` then `npm run dev` from this folder.
4. Configure your Supabase Auth redirect URL as `http://localhost:3000/auth/callback` (and the deployed equivalent). For Vercel Cron, set `CRON_SECRET`; Vercel forwards it to the route as a bearer token.

## What is implemented

- Email/password authentication and a public profile row created by a secure database trigger
- RLS-protected subscriptions, usage logs, and notifications
- Add, edit, pause, cancel, and delete subscriptions; quick-renew / cancel deep links
- Dashboard, subscription detail, spending chart + renewal calendar, and notification preferences
- Self-reported daily usage with value/keep suggestions at 4+ active days in the last 7 days
- A daily cron endpoint that creates renewal/unused notifications, fetches relevant TMDB title nudges, and sends configured email/SMS notifications while keeping resend logic idempotent

## Scheduled job

`GET /api/cron/daily` is invoked daily by `vercel.json`. During manual testing send `Authorization: Bearer <CRON_SECRET>`. The endpoint uses the service role only on the server and never exposes it to the browser.
