// Shared app state: the persisted Db plus what is on screen.
// Every change to `app.db` is written to localStorage by the effect below.

import { loadDb, saveDb } from './lib/storage';

export type View = 'bar' | 'customers' | 'settings';

export const app = $state({
  db: loadDb(),
  view: 'bar' as View,
  selectedTabId: null as string | null,
});

export function startPersisting(): void {
  $effect.root(() => {
    $effect(() => saveDb(JSON.stringify(app.db)));
  });
  // Ask Safari to keep our storage even under disk pressure.
  navigator.storage?.persist?.();
}

export const now = () => new Date().toISOString();
