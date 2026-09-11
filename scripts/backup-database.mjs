/**
 * SubTrack Database Backup Utility
 *
 * Connects to Supabase and creates snapshot exports of critical application tables:
 * - Core Tables: users, subscriptions, usage_logs, notifications
 * - Optional Tables: analytics_events
 *
 * Features:
 * - Paginated batch extraction (handles >1000 rows without silent truncation)
 * - Distinguishes between critical core tables and unmigrated optional tables
 * - Safe chronological snapshot pruning
 * - Proper exit codes for CI/CD and cron workflows
 *
 * Usage:
 *   node scripts/backup-database.mjs
 *   npm run db:backup
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load environment variables from .env.local or .env
function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Backup Error] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Backup Notice] SUPABASE_SERVICE_ROLE_KEY is not set. Using anon key; some tables may be limited by Row-Level Security.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { createClient: () => null },
});


// Core tables required for app functionality vs optional telemetry tables
const CORE_TABLES = ['users', 'subscriptions', 'usage_logs', 'notifications'];
const OPTIONAL_TABLES = ['analytics_events'];
const MAX_BACKUP_RETENTION = 14;
const BATCH_SIZE = 1000;

/**
 * Fetch all rows from a table using pagination to prevent truncation beyond 1000 rows
 */
async function fetchTableRows(table) {
  const allRows = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * BATCH_SIZE;
    const to = from + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allRows;
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(rootDir, 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[Backup] Starting SubTrack database snapshot at ${new Date().toISOString()}...`);

  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    source_url: supabaseUrl,
    table_counts: {},
    tables: {},
  };

  let coreErrors = 0;

  // Process core tables
  for (const table of CORE_TABLES) {
    try {
      const rows = await fetchTableRows(table);
      backupData.tables[table] = rows;
      backupData.table_counts[table] = rows.length;
      console.log(`  ✓ Exported ${table}: ${rows.length} rows`);
    } catch (err) {
      coreErrors++;
      console.error(`  ✕ [Critical Error] Failed to export core table "${table}": ${err.message}`);
      backupData.tables[table] = [];
      backupData.table_counts[table] = 0;
    }
  }

  // Process optional tables
  for (const table of OPTIONAL_TABLES) {
    try {
      const rows = await fetchTableRows(table);
      backupData.tables[table] = rows;
      backupData.table_counts[table] = rows.length;
      console.log(`  ✓ Exported ${table}: ${rows.length} rows`);
    } catch (err) {
      const isMissingTable =
        err.code === 'PGRST205' ||
        err.status === 404 ||
        err.message?.includes('schema cache') ||
        err.message?.includes('Could not find the table');

      if (isMissingTable) {
        console.log(`  ℹ Skipped ${table} (table not present in schema; see supabase/migrations/003_add_analytics_events.sql)`);
      } else {
        console.warn(`  ⚠ Warning: Could not export optional table "${table}": ${err.message}`);
      }
      // Omit missing optional table from backup output rather than leaving an ambiguous empty array
    }
  }

  if (coreErrors > 0) {
    console.error(`\n[Backup Aborted] Snapshot failed because ${coreErrors} core table(s) could not be retrieved.`);
    process.exit(1);
  }

  const backupFileName = `backup-${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);
  const latestFilePath = path.join(backupDir, 'backup-latest.json');

  const jsonContent = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(backupFilePath, jsonContent, 'utf-8');
  fs.writeFileSync(latestFilePath, jsonContent, 'utf-8');

  console.log(`\n[Backup Success] Snapshot saved:`);
  console.log(`  📁 ${backupFilePath} (${(Buffer.byteLength(jsonContent) / 1024).toFixed(2)} KB)`);
  console.log(`  📁 ${latestFilePath}`);

  // Prune older backups
  pruneOldBackups(backupDir, MAX_BACKUP_RETENTION);
}

function pruneOldBackups(backupDir, keepCount) {
  try {
    const backupPattern = /^backup-\d{4}-\d{2}-\d{2}.*\.json$/;
    const files = fs.readdirSync(backupDir)
      .filter(f => backupPattern.test(f))
      .sort((a, b) => b.localeCompare(a)); // ISO timestamps sort chronologically in reverse

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      for (const fileName of toDelete) {
        fs.unlinkSync(path.join(backupDir, fileName));
        console.log(`  🗑 Pruned old backup: ${fileName}`);
      }
    }
  } catch (err) {
    console.warn('[Backup] Failed to prune old backups:', err.message);
  }
}

runBackup().catch((err) => {
  console.error('[Backup Failed]:', err);
  process.exit(1);
});
