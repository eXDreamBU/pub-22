// Runs public/sw.js in a sandbox with fake caches and fetch, then sends it fetch events.

import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function loadWorker(fetchImpl: (input: unknown, init?: RequestInit) => Promise<Response>) {
  const listeners: Record<string, (event: unknown) => void> = {};
  const stored = new Map<string, Response>();
  const cache = {
    match: async (key: string) => stored.get(key)?.clone(),
    put: async (key: string, response: Response) => void stored.set(key, response),
  };
  const fetch = vi.fn(fetchImpl);
  runInNewContext(source, {
    self: { addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn) },
    caches: { open: async () => cache },
    location: { origin: 'https://exdreambu.github.io' },
    fetch,
    URL,
    Promise,
    setTimeout,
    Response,
  });
  async function navigate(): Promise<Response> {
    let result: Promise<Response> | undefined;
    listeners.fetch({
      request: { method: 'GET', mode: 'navigate', url: 'https://exdreambu.github.io/pub-22/' },
      respondWith: (r: Promise<Response>) => (result = r),
    });
    return result!;
  }
  return { fetch, stored, navigate };
}

describe('service worker page requests', () => {
  it('ask the network past the HTTP cache, so a new release shows on the next start', async () => {
    const { fetch, navigate } = loadWorker(async () => new Response('neu'));
    expect(await (await navigate()).text()).toBe('neu');
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-cache' });
  });

  it('fall back to the cached page when offline', async () => {
    const { stored, navigate } = loadWorker(async () => {
      throw new TypeError('offline');
    });
    stored.set('./', new Response('alt'));
    expect(await (await navigate()).text()).toBe('alt');
  });
});
