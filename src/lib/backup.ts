import type { Db } from './db';

const WEEK = 7 * 24 * 60 * 60 * 1000;

/** True when there is something to lose and the last backup (or the creation of the data) is over a week old. */
export function backupDue(db: Db, nowMs = Date.now()): boolean {
  return db.customers.length > 0 && nowMs - Date.parse(db.lastBackupAt ?? db.createdAt) > WEEK;
}
