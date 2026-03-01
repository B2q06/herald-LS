import type { HeraldDatabase } from '../db/database.ts';

/**
 * Run a single depreciation pass on all non-archived knowledge items.
 *
 * Each item's importance is multiplied by `(1 - rate)`, simulating daily decay.
 * Default rate is 0.05 (5% per run).
 *
 * Returns the number of rows affected.
 */
export function runDepreciation(db: HeraldDatabase, rate = 0.05): number {
  const result = db.db.run(
    'UPDATE knowledge_items SET importance = importance * ?1, updated_at = datetime(\'now\') WHERE archived_at IS NULL',
    [1 - rate],
  );
  return result.changes;
}
