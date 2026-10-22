import { createDb, parseBackup, type Db } from './db';

const KEY = 'pub22';

export function loadDb(): Db {
  const now = new Date().toISOString();
  const saved = localStorage.getItem(KEY);
  if (!saved) return createDb(now);
  try {
    return parseBackup(saved);
  } catch {
    // Never overwrite unreadable data: park it under its own key, then start fresh.
    localStorage.setItem(`${KEY}-unlesbar-${now}`, saved);
    return createDb(now);
  }
}

export function saveDb(json: string): void {
  localStorage.setItem(KEY, json);
}
