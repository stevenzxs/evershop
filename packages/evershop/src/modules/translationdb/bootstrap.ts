import { error } from '../../lib/log/logger.js';
import { reloadAllLocales } from '../../lib/locale/dictionary.js';
import { pool } from '../../lib/postgres/connection.js';
import { addProcessor } from '../../lib/util/registry.js';

/**
 * DB-backed content translations, no restarts.
 *
 * Two pieces:
 *
 * 1. A `localeDictionary` processor (the §6.20 seam) that merges
 *    `translation_override` rows over the disk CSV base whenever a locale
 *    dictionary is (re)built. Missing table / unreachable DB degrades to the
 *    disk base, so builds and fresh installs keep working.
 *
 * 2. A lightweight refresher: every REFRESH_INTERVAL_MS it fingerprints the
 *    overrides table (count + max(updated_at)) and hot-swaps the in-memory
 *    registry via reloadAllLocales() when the fingerprint changes. Adding or
 *    editing a translation is therefore a plain INSERT/UPDATE — live within
 *    one interval, no restart, regardless of how the row was written.
 */

const REFRESH_INTERVAL_MS = 30_000;

export function mergeOverrides(
  base: Record<string, string>,
  rows: { source: string; target: string }[]
): Record<string, string> {
  const merged = { ...base };
  for (const row of rows) {
    if (row && row.source && row.target) {
      merged[row.source] = row.target;
    }
  }
  return merged;
}

export default async () => {
  addProcessor(
    'localeDictionary',
    async (
      base: Record<string, string>,
      context: { locale?: string } | undefined
    ) => {
      const locale = context?.locale;
      if (!locale) {
        return base;
      }
      try {
        const { rows } = await pool.query(
          'SELECT source, target FROM translation_override WHERE locale = $1',
          [locale]
        );
        return mergeOverrides(base, rows);
      } catch (err) {
        // Fresh install: dictionaries build before migrations create the
        // table. Build-time (no DB) lands here too. Disk base is fine.
        return base;
      }
    }
  );

  let fingerprint: string | null = null;
  const refresh = async () => {
    try {
      const { rows } = await pool.query(
        'SELECT COUNT(*)::text AS n, COALESCE(MAX(updated_at), \'epoch\')::text AS latest FROM translation_override'
      );
      const current = `${rows[0].n}@${rows[0].latest}`;
      if (fingerprint === null) {
        // First successful check after boot: the boot-time dictionary build
        // may have predated the table (fresh install) or this processor, so
        // reconcile the registry with the DB once.
        fingerprint = current;
        await reloadAllLocales();
      } else if (current !== fingerprint) {
        fingerprint = current;
        await reloadAllLocales();
      }
    } catch (err) {
      // Table not ready yet (boot race with migrations) — try again next tick.
      error(err as Error);
    }
  };
  // unref: bootstrap also runs inside one-shot CLI processes (build, install)
  // and a referenced interval would keep those alive forever.
  setTimeout(refresh, 5_000).unref();
  setInterval(refresh, REFRESH_INTERVAL_MS).unref();
};
