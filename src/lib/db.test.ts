import { describe, expect, it } from 'vitest';
import {
  addCustomer,
  addItem,
  availablePoints,
  cancelTab,
  checkIn,
  createDb,
  lastVisits,
  openGuestTab,
  parseBackup,
  parseCardPayload,
  cardPayload,
  redeemReward,
  removeItem,
  setDiscountSteps,
  settle,
  tabSummary,
  type Db,
} from './db';

const NOW = '2026-10-22T20:00:00.000Z';

function dbWithCustomer(points = 0): { db: Db; id: string } {
  const db = createDb(NOW);
  const c = addCustomer(db, 'Murat K.', '', NOW);
  c.points = points;
  return { db, id: c.id };
}

describe('createDb', () => {
  it('seeds the drink menu with unique ids and default settings', () => {
    const db = createDb(NOW);
    expect(db.products.length).toBe(112);
    expect(new Set(db.products.map((p) => p.id)).size).toBe(112);
    expect(db.settings.pointsPerEuro).toBe(1);
  });
});

describe('card payload', () => {
  it('round-trips a customer id', () => {
    expect(parseCardPayload(cardPayload('abc123'))).toBe('abc123');
  });

  it('ignores QR codes that are not ours', () => {
    expect(parseCardPayload('https://example.com')).toBeNull();
  });
});

describe('checkIn', () => {
  it('opens one tab per customer and returns the open one on a second scan', () => {
    const { db, id } = dbWithCustomer();
    const first = checkIn(db, id, NOW);
    const second = checkIn(db, id, NOW);
    expect(second.id).toBe(first.id);
    expect(db.tabs.length).toBe(1);
  });

  it('throws for an unknown card', () => {
    const db = createDb(NOW);
    expect(() => checkIn(db, 'nope', NOW)).toThrow();
  });
});

describe('tab lines', () => {
  it('merges repeated taps into a quantity and keeps the booked price', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    const cola = db.products[0];
    addItem(tab, cola);
    addItem(tab, cola);
    cola.priceCents = 999;
    expect(tab.lines).toEqual([expect.objectContaining({ productId: cola.id, qty: 2, priceCents: 330 })]);
  });

  it('a price change only applies to new bookings', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    const cola = db.products[0];
    addItem(tab, cola);
    cola.priceCents = 400;
    addItem(tab, cola);
    expect(tab.lines.map((l) => [l.qty, l.priceCents])).toEqual([[1, 330], [1, 400]]);
  });

  it('removing drops one unit and then the line', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    addItem(tab, db.products[0]);
    addItem(tab, db.products[0]);
    removeItem(tab, 0);
    expect(tab.lines[0].qty).toBe(1);
    removeItem(tab, 0);
    expect(tab.lines).toEqual([]);
  });
});

describe('settle', () => {
  it('credits points on the paid amount, rounded down', () => {
    const { db, id } = dbWithCustomer();
    const tab = checkIn(db, id, NOW);
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 1850 });
    const closed = settle(db, tab.id, NOW);
    expect(closed.pointsEarned).toBe(18);
    expect(db.customers[0].points).toBe(18);
    expect(db.tabs).toEqual([]);
    expect(db.history).toEqual([closed]);
  });

  it('guests earn no points', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 1850 });
    expect(settle(db, tab.id, NOW).pointsEarned).toBe(0);
  });

  it('a euro discount lowers the paid amount, the points earned and costs points', () => {
    const { db, id } = dbWithCustomer(250);
    db.settings.discountPoints = 100;
    db.settings.discountCents = 500;
    const tab = checkIn(db, id, NOW);
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 1850 });
    setDiscountSteps(db, tab, 2);
    expect(tabSummary(db, tab)).toEqual({
      totalCents: 1850,
      discountCents: 1000,
      paidCents: 850,
      pointsSpent: 200,
      pointsEarned: 8,
    });
    settle(db, tab.id, NOW);
    expect(db.customers[0].points).toBe(250 - 200 + 8);
  });

  it('caps the discount at the tab total', () => {
    const { db, id } = dbWithCustomer(1000);
    db.settings.discountPoints = 100;
    db.settings.discountCents = 500;
    const tab = checkIn(db, id, NOW);
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 330 });
    setDiscountSteps(db, tab, 1);
    expect(tabSummary(db, tab)).toMatchObject({ discountCents: 330, paidCents: 0, pointsEarned: 0 });
  });

  it('a fixed reward costs its points at settle', () => {
    const { db, id } = dbWithCustomer(120);
    const tab = checkIn(db, id, NOW);
    redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 100 });
    settle(db, tab.id, NOW);
    expect(db.customers[0].points).toBe(20);
  });
});

describe('redeeming', () => {
  it('counts points already pending on the open tab', () => {
    const { db, id } = dbWithCustomer(150);
    const tab = checkIn(db, id, NOW);
    redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 100 });
    expect(availablePoints(db, tab)).toBe(50);
    expect(() => redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 100 })).toThrow();
  });

  it('refuses a discount the customer cannot pay for', () => {
    const { db, id } = dbWithCustomer(150);
    db.settings.discountPoints = 100;
    const tab = checkIn(db, id, NOW);
    expect(() => setDiscountSteps(db, tab, 2)).toThrow();
    expect(tab.discountSteps).toBe(0);
  });

  it('refuses another discount step once the total is covered', () => {
    const { db, id } = dbWithCustomer(1000);
    db.settings.discountPoints = 100;
    db.settings.discountCents = 500;
    const tab = checkIn(db, id, NOW);
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 330 });
    setDiscountSteps(db, tab, 1);
    expect(() => setDiscountSteps(db, tab, 2)).toThrow('ganze Summe');
    expect(tab.discountSteps).toBe(1);
  });

  it('guests cannot redeem', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    expect(() => redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 0 })).toThrow();
  });
});

describe('cancelTab', () => {
  it('removes the tab without touching points or history', () => {
    const { db, id } = dbWithCustomer(50);
    const tab = checkIn(db, id, NOW);
    redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 50 });
    cancelTab(db, tab.id);
    expect(db.tabs).toEqual([]);
    expect(db.history).toEqual([]);
    expect(db.customers[0].points).toBe(50);
  });
});

describe('lastVisits', () => {
  it('lists the newest closed tabs of one customer first', () => {
    const { db, id } = dbWithCustomer();
    settle(db, checkIn(db, id, '2026-10-01T20:00:00.000Z').id, '2026-10-01T23:00:00.000Z');
    settle(db, checkIn(db, id, '2026-10-20T20:00:00.000Z').id, '2026-10-20T23:00:00.000Z');
    settle(db, openGuestTab(db, 'Gast', NOW).id, NOW);
    expect(lastVisits(db, id, 5).map((v) => v.closedAt)).toEqual([
      '2026-10-20T23:00:00.000Z',
      '2026-10-01T23:00:00.000Z',
    ]);
  });
});

describe('parseBackup', () => {
  it('restores what was saved', () => {
    const { db } = dbWithCustomer(42);
    expect(parseBackup(JSON.stringify(db))).toEqual(db);
  });

  it('rejects a file that is not a backup', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow('Keine Pub-22-Sicherung');
    expect(() => parseBackup('kein json')).toThrow('Keine Pub-22-Sicherung');
  });
});
