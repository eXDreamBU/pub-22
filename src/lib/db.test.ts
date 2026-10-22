import { describe, expect, it } from 'vitest';
import {
  addCustomer,
  addItem,
  availablePoints,
  cancelTab,
  checkIn,
  closeShift,
  createDb,
  incrementLine,
  migrate,
  lastVisits,
  openGuestTab,
  parseBackup,
  parseCardPayload,
  payPart,
  renameCustomer,
  cardPayload,
  redeemReward,
  removeItem,
  setDiscountSteps,
  settle,
  settleTogether,
  summarizeShift,
  tabSummary,
  type Db,
} from './db';
import { pointsFor } from './money';

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

  it('incrementing a line keeps its snapshot price and ignores unknown lines', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch 3', NOW);
    const cola = db.products[0];
    addItem(tab, cola);
    cola.priceCents = 400;
    incrementLine(tab, 0);
    incrementLine(tab, 5);
    expect(tab.lines.map((l) => [l.qty, l.priceCents])).toEqual([[2, 330]]);
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
  it('never leaves the balance below zero when it was corrected below a pending reward', () => {
    const { db, id } = dbWithCustomer(100);
    const tab = checkIn(db, id, NOW);
    redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 100 });
    db.customers[0].points -= 50;
    addItem(tab, { id: 'x', category: 'Bier', name: 'Pils', priceCents: 200 });
    settle(db, tab.id, NOW);
    expect(db.customers[0].points).toBe(0);
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

const pils = { id: 'p1', category: 'Bier', name: 'Pils', priceCents: 400 };
const cola = { id: 'p2', category: 'Alkoholfrei', name: 'Cola', priceCents: 300 };

describe('tab lines', () => {
  it('snapshot the category of the product', () => {
    const db = createDb(NOW);
    const tab = openGuestTab(db, 'Tisch', NOW);
    addItem(tab, pils);
    expect(tab.lines[0].category).toBe('Bier');
  });
});

describe('closeShift', () => {
  function bookedDb() {
    const { db, id } = dbWithCustomer(300);
    db.settings.discountPoints = 100;
    db.settings.discountCents = 500;
    const a = checkIn(db, id, '2026-10-18T16:00:00.000Z');
    addItem(a, pils);
    addItem(a, pils);
    addItem(a, cola);
    setDiscountSteps(db, a, 1);
    redeemReward(db, a, { id: 'r', name: 'Freigetränk', points: 100 });
    settle(db, a.id, '2026-10-18T20:00:00.000Z');
    const g = openGuestTab(db, 'Gast', '2026-10-18T15:30:00.000Z');
    addItem(g, cola);
    settle(db, g.id, '2026-10-18T21:00:00.000Z');
    return db;
  }

  it('freezes totals, categories, rewards and note and stamps the tabs', () => {
    const db = bookedDb();
    const shift = closeShift(db, '  Kasse stimmt  ', '2026-10-19T01:00:00.000Z');
    expect(shift).toMatchObject({
      startedAt: '2026-10-18T15:30:00.000Z',
      closedAt: '2026-10-19T01:00:00.000Z',
      tabCount: 2,
      totalCents: 1400,
      discountCents: 500,
      paidCents: 900,
      byCategory: [
        { category: 'Bier', cents: 800, qty: 2 },
        { category: 'Alkoholfrei', cents: 600, qty: 2 },
      ],
      rewards: [{ name: 'Freigetränk', count: 1 }],
      note: 'Kasse stimmt',
    });
    expect(db.shifts).toEqual([shift]);
    expect(db.history.every((t) => t.shiftId === shift.id)).toBe(true);
  });

  it('refuses while a tab is open', () => {
    const db = bookedDb();
    openGuestTab(db, 'offen', NOW);
    expect(() => closeShift(db, '', NOW)).toThrow('Erst alle Deckel');
    expect(db.shifts).toEqual([]);
  });

  it('refuses an empty shift, so closing twice fails', () => {
    const db = bookedDb();
    closeShift(db, '', NOW);
    expect(() => closeShift(db, '', NOW)).toThrow('noch keinen');
    expect(db.shifts.length).toBe(1);
  });

  it('the next shift only contains tabs settled after the close', () => {
    const db = bookedDb();
    const first = closeShift(db, '', NOW);
    settle(db, openGuestTab(db, 'neu', NOW).id, NOW);
    const second = closeShift(db, '', NOW);
    expect([first.tabCount, second.tabCount]).toEqual([2, 1]);
    expect(db.history.length).toBe(3);
  });
});

describe('migrate', () => {
  function v1(): unknown {
    const line = { productId: 'p1', name: 'Pils', priceCents: 400, qty: 2 };
    const orphan = { productId: 'gone', name: 'Alt', priceCents: 100, qty: 1 };
    const base = { label: 'A', rewards: [], discountSteps: 0 };
    return {
      version: 1,
      products: [{ id: 'p1', category: 'Bier', name: 'Pils', priceCents: 400 }],
      customers: [],
      tabs: [{ ...base, id: 't0', openedAt: '2026-10-20T10:00:00.000Z', lines: [{ ...line }] }],
      history: [
        { ...base, id: 't1', openedAt: '2026-10-10T18:00:00.000Z', closedAt: '2026-10-10T22:00:00.000Z', lines: [{ ...line }, orphan], totalCents: 900, discountCents: 0, paidCents: 900, pointsSpent: 0, pointsEarned: 0 },
        { ...base, id: 't2', openedAt: '2026-10-09T18:00:00.000Z', closedAt: '2026-10-11T01:00:00.000Z', lines: [{ ...line }], totalCents: 800, discountCents: 0, paidCents: 800, pointsSpent: 0, pointsEarned: 0 },
      ],
      rewards: [],
      settings: { pointsPerEuro: 1, discountPoints: 100, discountCents: 500 },
      createdAt: NOW,
    };
  }

  it('moves old history into one "vor 0.2" shift and fills categories', () => {
    const db = migrate(v1());
    expect(db.version).toBe(2);
    expect(db.shifts).toHaveLength(1);
    expect(db.shifts[0]).toMatchObject({
      note: 'vor 0.2',
      startedAt: '2026-10-09T18:00:00.000Z',
      closedAt: '2026-10-11T01:00:00.000Z',
      tabCount: 2,
      paidCents: 1700,
    });
    expect(db.history.every((t) => t.shiftId === db.shifts[0].id)).toBe(true);
    expect(db.history[0].lines.map((l) => l.category)).toEqual(['Bier', 'Sonstiges']);
    expect(db.tabs[0].lines[0].category).toBe('Bier');
  });

  it('creates no shift for an empty v1 history', () => {
    const data = v1() as { history: unknown[] };
    data.history = [];
    expect(migrate(data).shifts).toEqual([]);
  });

  it('passes v2 through and rejects anything else', () => {
    const db = createDb(NOW);
    expect(migrate(db)).toBe(db);
    expect(() => migrate({ ...db, shifts: undefined })).toThrow('Keine Pub-22-Sicherung');
    expect(() => migrate({ ...db, version: 3 })).toThrow('Keine Pub-22-Sicherung');
    expect(() => migrate(null)).toThrow('Keine Pub-22-Sicherung');
  });

  it('parseBackup runs old backups through the migration', () => {
    expect(parseBackup(JSON.stringify(v1())).version).toBe(2);
  });
});

const pint = { id: 'p', category: 'Bier', name: 'Pils', priceCents: 420 };
const coke = { id: 'c', category: 'Alkoholfrei', name: 'Cola', priceCents: 300 };

describe('settleTogether', () => {
  function threeTabs() {
    const db = createDb(NOW);
    const murat = addCustomer(db, 'Murat K.', '', NOW);
    const jonas = addCustomer(db, 'Jonas', '', NOW);
    jonas.points = 150;
    const a = checkIn(db, murat.id, NOW);
    const b = checkIn(db, jonas.id, NOW);
    const g = openGuestTab(db, 'Tisch 5', NOW);
    for (let i = 0; i < 4; i++) addItem(a, pint); // 16,80
    addItem(b, pint); // 4,20
    addItem(g, coke); // 3,00
    return { db, murat, jonas, a, b, g };
  }

  it('the payer earns points on the whole sum, rounded down once', () => {
    const { db, murat, jonas, a, b, g } = threeTabs();
    const closed = settleTogether(db, [a.id, b.id, g.id], a.id, NOW);
    expect(closed.reduce((s, t) => s + t.paidCents, 0)).toBe(2400);
    expect(murat.points).toBe(24);
    expect(jonas.points).toBe(150);
    expect(closed.map((t) => t.pointsEarned)).toEqual([24, 0, 0]);
    expect(closed.map((t) => t.paidBy)).toEqual([undefined, 'Murat K.', 'Murat K.']);
    expect(db.tabs).toEqual([]);
    expect(db.history).toEqual(closed);
  });

  it('a payer without card means no points for anyone', () => {
    const { db, murat, jonas, a, b, g } = threeTabs();
    settleTogether(db, [a.id, b.id, g.id], g.id, NOW);
    expect(murat.points).toBe(0);
    expect(jonas.points).toBe(150);
  });

  it('redeemed points come off the balance of the tab they were redeemed on', () => {
    const { db, murat, jonas, a, b } = threeTabs();
    redeemReward(db, b, { id: 'r', name: 'Freigetränk', points: 100 });
    settleTogether(db, [a.id, b.id], a.id, NOW);
    expect(jonas.points).toBe(50);
    expect(murat.points).toBe(21);
  });

  it('rejects a payer outside the group and unknown tabs', () => {
    const { db, a, b, g } = threeTabs();
    expect(() => settleTogether(db, [a.id, b.id], g.id, NOW)).toThrow();
    expect(() => settleTogether(db, [a.id, 'nope'], a.id, NOW)).toThrow('Deckel nicht gefunden');
    expect(db.tabs.length).toBe(3);
  });

  it('settle alone is the group of one', () => {
    const { db, murat, a } = threeTabs();
    const closed = settle(db, a.id, NOW);
    expect(closed.paidBy).toBeUndefined();
    expect(murat.points).toBe(16);
  });
});

describe('payPart', () => {
  function table() {
    const { db, id } = dbWithCustomer(300);
    const tab = checkIn(db, id, NOW);
    for (let i = 0; i < 5; i++) addItem(tab, pint);
    addItem(tab, coke);
    return { db, tab };
  }

  it('closes the picked quantities as a guest entry without points, the rest stays open', () => {
    const { db, tab } = table();
    const part = payPart(db, tab.id, [2, 1], NOW);
    expect(part).toMatchObject({ label: 'Murat K. (Teil)', paidCents: 1140, pointsEarned: 0, pointsSpent: 0 });
    expect(part.customerId).toBeUndefined();
    expect(part.lines.map((l) => l.qty)).toEqual([2, 1]);
    expect(tab.lines.map((l) => l.qty)).toEqual([3]);
    expect(db.customers[0].points).toBe(300);
    expect(db.tabs).toEqual([tab]);
    expect(db.history).toEqual([part]);
    expect(summarizeShift(db.history).paidCents).toBe(1140);
  });

  it('paying everything closes the tab', () => {
    const { db, tab } = table();
    payPart(db, tab.id, [5, 1], NOW);
    expect(db.tabs).toEqual([]);
  });

  it('keeps a tab with a pending reward open', () => {
    const { db, tab } = table();
    redeemReward(db, tab, { id: 'r', name: 'Freigetränk', points: 100 });
    payPart(db, tab.id, [5, 1], NOW);
    expect(db.tabs).toEqual([tab]);
  });

  it('rejects nothing picked, more than on the tab and broken input', () => {
    const { db, tab } = table();
    expect(() => payPart(db, tab.id, [0, 0], NOW)).toThrow();
    expect(() => payPart(db, tab.id, [6, 0], NOW)).toThrow();
    expect(() => payPart(db, tab.id, [-1, 1], NOW)).toThrow();
    expect(() => payPart(db, tab.id, [1.5, 0], NOW)).toThrow();
    expect(() => payPart(db, tab.id, [1], NOW)).toThrow();
    expect(tab.lines.map((l) => l.qty)).toEqual([5, 1]);
    expect(db.history).toEqual([]);
  });

  it('the rest cannot drop below the redeemed euro discount', () => {
    const { db, tab } = table(); // 24,00 total
    db.settings.discountCents = 500;
    setDiscountSteps(db, tab, 2); // 10,00 discount
    expect(() => payPart(db, tab.id, [4, 0], NOW)).toThrow('Erst den Rabatt verringern'); // rest 7,20
    payPart(db, tab.id, [3, 0], NOW); // rest 11,40
    expect(tabSummary(db, tab).discountCents).toBe(1000);
  });
});

describe('shift with part and joint payments', () => {
  it('counts every paid cent and every drink exactly once', () => {
    const db = createDb(NOW);
    const murat = addCustomer(db, 'Murat K.', '', NOW);
    const a = checkIn(db, murat.id, NOW);
    const t = openGuestTab(db, 'Tisch 3', NOW);
    for (let i = 0; i < 5; i++) addItem(t, pint);
    addItem(t, coke);
    addItem(a, pint);
    payPart(db, t.id, [2, 1], NOW);
    settleTogether(db, [a.id, t.id], a.id, NOW);
    const shift = closeShift(db, '', NOW);
    expect(shift.paidCents).toBe(db.history.reduce((sum, h) => sum + h.paidCents, 0));
    expect(shift.paidCents).toBe(6 * 420 + 300);
    expect(shift.tabCount).toBe(db.history.length);
    expect(shift.byCategory.reduce((sum, c) => sum + c.qty, 0)).toBe(7);
    expect(murat.points).toBe(pointsFor(4 * 420, 1));
  });
});

describe('renameCustomer', () => {
  it('renames the open tab when it still carries the old name', () => {
    const { db, id } = dbWithCustomer();
    const tab = checkIn(db, id, NOW);
    renameCustomer(db, id, ' Murat Kaya ');
    expect(db.customers[0].name).toBe('Murat Kaya');
    expect(tab.label).toBe('Murat Kaya');
  });

  it('leaves a tab renamed by hand alone and ignores an empty name', () => {
    const { db, id } = dbWithCustomer();
    const tab = checkIn(db, id, NOW);
    tab.label = 'Tisch 3 Murat';
    renameCustomer(db, id, 'Murat Kaya');
    expect(tab.label).toBe('Tisch 3 Murat');
    renameCustomer(db, id, '  ');
    expect(db.customers[0].name).toBe('Murat Kaya');
  });
});
