# SubTrack Database Backup & Disaster Recovery Runbook

This document outlines the backup architecture, automated retention policies, and recovery procedures for the SubTrack database.

---

## 1. Backup Strategy Overview

SubTrack uses Supabase (PostgreSQL) as its primary persistent store. To protect against accidental deletion, migration errors, or service interruptions, SubTrack implements a multi-tier backup approach:

| Tier | Frequency | Storage Location | Retention |
| :--- | :--- | :--- | :--- |
| **CLI / Manual Snapshot** | On demand (`npm run db:backup`) | `backups/backup-<timestamp>.json` | Last 14 backups |
| **Automated CI Workflow** | Nightly at 02:00 UTC | GitHub Actions Artifacts | 30 days |
| **Supabase WAL / PITR** | Continuous / Daily | Supabase Cloud Backups | Per project tier |

### Backed-Up Tables
The backup engine captures all user data across core tables:
- `users`: User profiles, reminder preferences, quiet hours settings
- `subscriptions`: Active and paused subscriptions, billing cycles, costs, next renewal dates
- `usage_logs`: Usage frequency, dates, and engagement records
- `notifications`: In-app and outbound notification history and statuses
- `analytics_events`: Product usage telemetry, feature engagement, and navigation events

---

## 2. Generating a Manual Backup

Run the automated backup script from the project root:

```bash
npm run db:backup
```

### Output:
```text
[Backup] Starting SubTrack database snapshot at 2026-09-08T19:08:57.656Z...
  ✓ Exported users: 4 rows
  ✓ Exported subscriptions: 5 rows
  ✓ Exported usage_logs: 28 rows
  ✓ Exported notifications: 2 rows
  ✓ Exported analytics_events: 12 rows
[Backup Success] Snapshot saved:
  📁 N:\subtrack\backups\backup-2026-09-08T19-08-57-655Z.json (11.87 KB)
  📁 N:\subtrack\backups\backup-latest.json
```

---

## 3. Disaster Recovery: Restoring from a Snapshot

If data is corrupted or accidentally deleted, follow these steps to restore from a backup JSON snapshot:

### Step 1: Locate the Target Backup
Find the desired backup in the `backups/` directory or download the latest artifact from the **GitHub Actions** "Database Snapshot Backup" run.

```bash
# Example backup file
backups/backup-latest.json
```

### Step 2: Restoration Order
Tables must be restored in relational dependency order:
1. `users` (Parent records)
2. `subscriptions` (References `user_id`)
3. `usage_logs` (References `subscription_id` and `user_id`)
4. `notifications` (References `subscription_id`)
5. `analytics_events` (Telemetry records)

### Step 3: Run the Restoration Script
To restore a snapshot into Supabase, you can run a Node restoration script using `@supabase/supabase-js`:

```javascript
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const backup = JSON.parse(fs.readFileSync('backups/backup-latest.json', 'utf8'));
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function restore() {
  // 1. Restore users
  if (backup.tables.users?.length) {
    await supabase.from('users').upsert(backup.tables.users, { onConflict: 'id' });
  }

  // 2. Restore subscriptions
  if (backup.tables.subscriptions?.length) {
    await supabase.from('subscriptions').upsert(backup.tables.subscriptions, { onConflict: 'id' });
  }

  // 3. Restore usage logs
  if (backup.tables.usage_logs?.length) {
    await supabase.from('usage_logs').upsert(backup.tables.usage_logs, { onConflict: 'id' });
  }

  console.log('Restoration completed successfully.');
}
restore();
```

---

## 4. Verification Checklist

After performing a restore:
1. Run automated tests to verify business logic integrity:
   ```bash
   npm run test
   ```
2. Check health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```
3. Inspect row counts and verify subscription calendar projections display properly in the dashboard.
