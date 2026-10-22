import { createDb, parseBackup, type Db } from './db';

const KEY = 'pub22';

export function loadDb(): Db {
  const saved = localStorage.getItem(KEY);
  return saved ? parseBackup(saved) : createDb(new Date().toISOString());
}

export function saveDb(json: string): void {
  localStorage.setItem(KEY, json);
}
