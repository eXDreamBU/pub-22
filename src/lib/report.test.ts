import { describe, expect, it } from 'vitest';
import { backupDue } from './backup';
import {
  addCustomer,
  addItem,
  checkIn,
  closeShift,
  createDb,
  openGuestTab,
  redeemReward,
  settle,
  type ClosedTab,
  type Db,
  type Shift,
} from './db';
import {
  customerRanking,
  inPeriod,
  periodTotals,
  runningShift,
  shiftDay,
  shiftsCsv,
  shiftsInPeriod,
  tabsCsv,
  tabsInPeriod,
  topDrinks,
} from './report';

// Local-time stamps so the tests do not depend on the machine's time zone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const NOW = at(2026, 10, 22);
const pils = { id: 'p1', category: 'Bier', name: 'Pils', size: '0,5 l', priceCents: 400 };
const cola = { id: 'p2', category: 'Alkoholfrei', name: 'Cola', priceCents: 300 };

function fakeShift(startedAt: string, paidCents: number, over: Partial<Shift> = {}): Shift {
  return {
    id: startedAt,
    startedAt,
    closedAt: startedAt,
    tabCount: 2,
    totalCents: paidCents + 100,
    discountCents: 100,
    paidCents,
    byCategory: [],
    rewards: [],
    note: '',
    ...over,
  };
}

describe('shiftDay', () => {
  it('belongs to the start day even when the shift ends after midnight', () => {
    expect(shiftDay(fakeShift(at(2026, 10, 18, 17, 55), 0, { closedAt: at(2026, 10, 19, 2, 40) }))).toBe('2026-10-18');
  });
  it('a shift starting after midnight belongs to that day', () => {
    expect(shiftDay(fakeShift(at(2026, 10, 19, 0, 10), 0))).toBe('2026-10-19');
  });
});

describe('runningShift', () => {
  it('counts closed tabs of the running shift and the open tabs separately', () => {
    const db = createDb(NOW);
    const a = openGuestTab(db, 'A', at(2026, 10, 18, 18));
    addItem(a, pils);
    settle(db, a.id, at(2026, 10, 18, 19));
    closeShift(db, '', at(2026, 10, 18, 20));
    const b = openGuestTab(db, 'B', at(2026, 10, 18, 21));
    addItem(b, pils);
    addItem(b, cola);
    settle(db, b.id, at(2026, 10, 18, 22));
    const c = openGuestTab(db, 'C', at(2026, 10, 18, 22, 30));
    addItem(c, cola);
    expect(runningShift(db)).toEqual({
      startedAt: at(2026, 10, 18, 21),
      tabCount: 1,
      paidCents: 700,
      openTabs: 1,
      openCents: 300,
    });
  });
  it('is empty for a fresh db', () => {
    expect(runningShift(createDb(NOW))).toEqual({
      startedAt: undefined,
      tabCount: 0,
      paidCents: 0,
      openTabs: 0,
      openCents: 0,
    });
  });
});

describe('periodTotals', () => {
  const shifts = [
    fakeShift(at(2026, 10, 19, 18), 1000), // Mon, KW 43
    fakeShift(at(2026, 10, 18, 18), 2000, { closedAt: at(2026, 10, 19, 2) }), // Sun, KW 42 although it ends in KW 43
    fakeShift(at(2026, 10, 12, 18), 500), // Mon, KW 42
    fakeShift(at(2026, 9, 30, 18), 700), // Wed, KW 40
  ];
  it('groups by ISO week, newest first, by the start day', () => {
    expect(periodTotals(shifts, 'week').map((p) => [p.label, p.paidCents, p.tabCount])).toEqual([
      ['KW 43 / 2026', 1000, 2],
      ['KW 42 / 2026', 2500, 4],
      ['KW 40 / 2026', 700, 2],
    ]);
  });
  it('groups by month and sums the discount', () => {
    expect(periodTotals(shifts, 'month').map((p) => [p.label, p.paidCents, p.discountCents])).toEqual([
      ['Oktober 2026', 3500, 300],
      ['September 2026', 700, 100],
    ]);
  });
  it('puts the year boundary in the right ISO week', () => {
    expect(periodTotals([fakeShift(at(2027, 1, 1), 1)], 'week')[0].label).toBe('KW 53 / 2026');
  });
});

describe('inPeriod', () => {
  const today = '2026-10-22'; // Thu, KW 43
  it('matches the calendar week, month, year or everything of today', () => {
    expect(inPeriod('2026-10-19', 'week', today)).toBe(true);
    expect(inPeriod('2026-10-18', 'week', today)).toBe(false);
    expect(inPeriod('2026-10-01', 'month', today)).toBe(true);
    expect(inPeriod('2026-09-30', 'month', today)).toBe(false);
    expect(inPeriod('2026-01-01', 'year', today)).toBe(true);
    expect(inPeriod('2025-12-31', 'year', today)).toBe(false);
    expect(inPeriod('1999-01-01', 'all', today)).toBe(true);
  });
});

describe('tabsInPeriod and shiftsInPeriod', () => {
  it('put tabs paid after midnight into the start day of their shift', () => {
    const db = createDb(NOW);
    const t = openGuestTab(db, 'A', at(2026, 10, 31, 20));
    addItem(t, pils);
    settle(db, t.id, at(2026, 11, 1, 1));
    closeShift(db, '', at(2026, 11, 1, 2));
    const october = new Date(2026, 9, 31, 12);
    const november = new Date(2026, 10, 5, 12);
    expect(tabsInPeriod(db, 'month', october)).toHaveLength(1);
    expect(shiftsInPeriod(db, 'month', october)).toHaveLength(1);
    expect(tabsInPeriod(db, 'month', november)).toEqual([]);
    expect(shiftsInPeriod(db, 'month', november)).toEqual([]);
  });

  it('count the running shift in the week it started, also after midnight', () => {
    const db = createDb(NOW);
    const a = openGuestTab(db, 'A', at(2026, 10, 25, 20)); // Sun, KW 43
    settle(db, a.id, at(2026, 10, 25, 23));
    const b = openGuestTab(db, 'B', at(2026, 10, 26, 0, 30)); // Mon, KW 44
    settle(db, b.id, at(2026, 10, 26, 1));
    expect(tabsInPeriod(db, 'week', new Date(2026, 9, 26, 1, 30))).toHaveLength(2);
    closeShift(db, '', at(2026, 10, 26, 2));
    expect(tabsInPeriod(db, 'week', new Date(2026, 9, 26, 12))).toEqual([]);
    expect(tabsInPeriod(db, 'week', new Date(2026, 9, 25, 12))).toHaveLength(2);
  });
});

function history(): { db: Db; tabs: ClosedTab[] } {
  const db = createDb(NOW);
  const murat = addCustomer(db, 'Murat', '', NOW);
  murat.points = 500;
  const jonas = addCustomer(db, 'Jonas', '', NOW);
  for (let i = 0; i < 2; i++) {
    const t = checkIn(db, murat.id, at(2026, 10, 20 + i, 19));
    addItem(t, pils);
    addItem(t, pils);
    if (i === 0) redeemReward(db, t, { id: 'r', name: 'Freigetränk', points: 100 });
    settle(db, t.id, at(2026, 10, 20 + i, 23));
  }
  const j = checkIn(db, jonas.id, at(2026, 10, 20, 19));
  addItem(j, cola);
  settle(db, j.id, at(2026, 10, 20, 23));
  for (let i = 0; i < 2; i++) {
    const g = openGuestTab(db, 'Gast', at(2026, 10, 20, 19));
    addItem(g, cola);
    settle(db, g.id, at(2026, 10, 20, 23));
  }
  return { db, tabs: db.history };
}

describe('topDrinks', () => {
  it('counts per name and size, most sold first', () => {
    expect(topDrinks(history().tabs)).toEqual([
      { name: 'Pils', size: '0,5 l', qty: 4 },
      { name: 'Cola', size: undefined, qty: 3 },
    ]);
  });
});

describe('customerRanking', () => {
  it('ranks customers, puts the guest row last and uses the current name', () => {
    const { db, tabs } = history();
    db.customers[0].name = 'Murat K.';
    const rows = customerRanking(db, tabs);
    expect(rows.map((r) => [r.customerId ? r.name : '-', r.paidCents, r.tabCount, r.avgCents, r.freeCount])).toEqual([
      ['Murat K.', 1600, 2, 800, 1],
      ['Jonas', 300, 1, 300, 0],
      ['-', 600, 2, 300, 0],
    ]);
  });
  it('sorts by tab count or discount', () => {
    const { db, tabs } = history();
    expect(customerRanking(db, tabs, 'tabs')[0].name).toBe('Murat');
    tabs[2].discountCents = 50; // Jonas
    expect(customerRanking(db, tabs, 'discount')[0].name).toBe('Jonas');
  });
  it('falls back to the tab label for a deleted customer', () => {
    const { db, tabs } = history();
    db.customers = [];
    expect(customerRanking(db, tabs)[0].name).toBe('Murat');
  });
  it('rounds the average down', () => {
    const { db, tabs } = history();
    tabs[0].paidCents = 101;
    tabs[1].paidCents = 100;
    expect(customerRanking(db, tabs).find((r) => r.name === 'Murat')?.avgCents).toBe(100);
  });
});

describe('CSV', () => {
  it('writes shifts Excel-style', () => {
    const shifts = [
      fakeShift(at(2026, 10, 18, 17, 55), 125050, {
        closedAt: at(2026, 10, 19, 2, 40),
        tabCount: 41,
        totalCents: 126050,
        discountCents: 1000,
        byCategory: [{ category: 'Bier', cents: 126050, qty: 9 }],
        rewards: [{ name: 'Frei', count: 4 }],
        note: 'Abweichung; "5 €"',
      }),
      fakeShift(at(2026, 10, 19, 18), 5, { byCategory: [{ category: 'Snacks', cents: 105, qty: 1 }] }),
    ];
    expect(shiftsCsv(shifts)).toBe(
      '﻿Tag;Beginn;Ende;Deckel;Getränke;Rabatt;Kassiert;Bier;Snacks;Freigetränke;Notiz\r\n' +
        '18.10.2026;17:55;02:40;41;1260,50;10,00;1250,50;1260,50;0,00;4× Frei;"Abweichung; ""5 €"""\r\n' +
        '19.10.2026;18:00;18:00;2;1,05;1,00;0,05;0,00;1,05;;\r\n',
    );
  });
  it('writes tabs', () => {
    const { tabs } = history();
    const lines = tabsCsv(tabs.slice(0, 1)).split('\r\n');
    expect(lines[0]).toBe('﻿Datum;Geöffnet;Bezahlt;Name;Kunde;Summe;Rabatt;Bezahlt €;Punkte +;Punkte −');
    expect(lines[1]).toBe('20.10.2026;19:00;23:00;Murat;ja;8,00;0,00;8,00;8;100');
    expect(lines[2]).toBe('');
  });
  it('defuses typed text that Excel would run as a formula', () => {
    const tab = { ...history().tabs[0], label: '=HYPERLINK("x")' };
    expect(tabsCsv([tab]).split('\r\n')[1]).toContain(`;"'=HYPERLINK(""x"")";`);
  });
});

describe('backupDue', () => {
  const now = Date.parse('2026-10-22T12:00:00Z');
  it('is due after a week with customers, never without them', () => {
    const db = createDb('2026-10-01T00:00:00Z');
    expect(backupDue(db, now)).toBe(false);
    addCustomer(db, 'A', '', NOW);
    expect(backupDue(db, now)).toBe(true);
    db.lastBackupAt = '2026-10-20T00:00:00Z';
    expect(backupDue(db, now)).toBe(false);
  });
});
