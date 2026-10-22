// Reports over the closed tabs and shifts: pure functions, no UI. Money stays integer cents.

import { creditedThisShift, inBar, runningTabs, tabSummary, type ClosedTab, type Db, type Shift } from './db';

export type Period = 'week' | 'month' | 'year' | 'all';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day 'YYYY-MM-DD' of a timestamp. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The business day of a shift: the day it started, so 17:55-02:40 belongs to the start day. */
export function shiftDay(shift: Shift): string {
  return localDay(shift.startedAt);
}

/** Start of the running shift: as closeShift will record it (paid, in the bar or credited since the last close). */
function runningShiftStart(db: Db): string | undefined {
  return [...runningTabs(db), ...inBar(db), ...creditedThisShift(db)].map((t) => t.openedAt).sort()[0];
}

export function runningShift(db: Db) {
  const tabs = runningTabs(db);
  return {
    startedAt: runningShiftStart(db),
    tabCount: tabs.length,
    paidCents: tabs.reduce((sum, t) => sum + t.paidCents, 0),
    openTabs: inBar(db).length,
    openCents: inBar(db).reduce((sum, t) => sum + tabSummary(db, t).paidCents, 0),
  };
}

/** ISO 8601 week of a 'YYYY-MM-DD' day: key sorts chronologically, label is for the screen. */
function weekOf(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // the Thursday decides the year
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { key: `${year}-W${pad(week)}`, label: `KW ${week} / ${year}` };
}

const monthName = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' });

function monthOf(day: string) {
  const [y, m] = day.split('-').map(Number);
  return { key: `${y}-${pad(m)}`, label: monthName.format(new Date(y, m - 1, 1)) };
}

export interface PeriodTotal {
  key: string;
  label: string;
  paidCents: number;
  discountCents: number;
  houseCents: number;
  tabCount: number;
}

export function periodTotals(shifts: Shift[], by: 'week' | 'month'): PeriodTotal[] {
  const groups = new Map<string, PeriodTotal>();
  for (const shift of shifts) {
    const { key, label } = (by === 'week' ? weekOf : monthOf)(shiftDay(shift));
    const g = groups.get(key) ?? { key, label, paidCents: 0, discountCents: 0, houseCents: 0, tabCount: 0 };
    g.paidCents += shift.paidCents;
    g.discountCents += shift.discountCents;
    g.houseCents += shift.houseCents ?? 0;
    g.tabCount += shift.tabCount;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

/** Is this 'YYYY-MM-DD' day in the same calendar week / month / year as `today`? */
export function inPeriod(day: string, period: Period, today: string): boolean {
  if (period === 'all') return true;
  if (period === 'year') return day.slice(0, 4) === today.slice(0, 4);
  if (period === 'month') return monthOf(day).key === monthOf(today).key;
  return weekOf(day).key === weekOf(today).key;
}

/** Today's business day: while a shift runs, the day it started (01:00 on Monday still belongs to Sunday). */
function businessToday(db: Db, now: Date): string {
  return localDay(runningShiftStart(db) ?? now.toISOString());
}

/** Paid tabs whose shift (closed or running) started in the period, so they add up with `shiftsInPeriod`. */
export function tabsInPeriod(db: Db, period: Period, now: Date): ClosedTab[] {
  const today = businessToday(db, now);
  const running = runningShiftStart(db);
  const shiftStart = new Map(db.shifts.map((s) => [s.id, s.startedAt]));
  return db.history.filter((t) =>
    inPeriod(localDay(t.shiftId ? shiftStart.get(t.shiftId)! : running!), period, today),
  );
}

export function shiftsInPeriod(db: Db, period: Period, now: Date): Shift[] {
  const today = businessToday(db, now);
  return db.shifts.filter((s) => inPeriod(shiftDay(s), period, today));
}

export function topDrinks(tabs: ClosedTab[]): { name: string; size?: string; qty: number }[] {
  const drinks = new Map<string, { name: string; size?: string; qty: number }>();
  for (const line of tabs.flatMap((t) => t.lines)) {
    const key = `${line.name}\u0000${line.size ?? ''}`;
    const d = drinks.get(key) ?? { name: line.name, size: line.size, qty: 0 };
    d.qty += line.qty;
    drinks.set(key, d);
  }
  return [...drinks.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name, 'de'));
}

export type RankingKey = 'paid' | 'tabs' | 'discount';

export interface CustomerRow {
  customerId?: string; // missing = all guests without card together
  name: string;
  paidCents: number;
  tabCount: number;
  avgCents: number;
  discountCents: number;
  freeCount: number;
}

/** One row per customer, sorted by `sortBy` (descending); guests without card are one row at the end. */
export function customerRanking(db: Db, tabs: ClosedTab[], sortBy: RankingKey = 'paid'): CustomerRow[] {
  const rows = new Map<string | undefined, CustomerRow>();
  for (const tab of tabs) {
    const row = rows.get(tab.customerId) ?? {
      customerId: tab.customerId,
      name: tab.customerId ? tab.label : 'Gäste ohne Karte (zusammen)',
      paidCents: 0,
      tabCount: 0,
      avgCents: 0,
      discountCents: 0,
      freeCount: 0,
    };
    row.paidCents += tab.paidCents;
    row.tabCount++;
    row.discountCents += tab.discountCents;
    row.freeCount += tab.rewards.length;
    rows.set(tab.customerId, row);
  }
  for (const row of rows.values()) {
    row.avgCents = Math.floor(row.paidCents / row.tabCount);
    const current = db.customers.find((c) => c.id === row.customerId);
    if (current) row.name = current.name;
  }
  const field = { paid: 'paidCents', tabs: 'tabCount', discount: 'discountCents' } as const;
  const guests = rows.get(undefined);
  rows.delete(undefined);
  const sorted = [...rows.values()].sort(
    (a, b) => b[field[sortBy]] - a[field[sortBy]] || a.name.localeCompare(b.name, 'de'),
  );
  return guests ? [...sorted, guests] : sorted;
}

// --- CSV for Excel (German): BOM, ';' separator, CRLF, decimal comma ---

const csvEuro = (cents: number) => `${Math.floor(cents / 100)},${pad(cents % 100)}`;
const csvDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};
const csvTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const csvField = (value: string | number) => {
  // Typed text like "=HYPERLINK(...)" would run as a formula in Excel; a leading ' keeps it text.
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = (rows: (string | number)[][]) => '﻿' + rows.map((r) => r.map(csvField).join(';') + '\r\n').join('');

export function shiftsCsv(shifts: Shift[]): string {
  const categories = [...new Set(shifts.flatMap((s) => s.byCategory.map((c) => c.category)))];
  const rows: (string | number)[][] = [
    ['Tag', 'Beginn', 'Ende', 'Deckel', 'Getränke', 'Rabatt', 'Aufs Haus', 'Kassiert', ...categories, 'Freigetränke', 'Notiz'],
  ];
  for (const s of shifts) {
    rows.push([
      csvDate(s.startedAt),
      csvTime(s.startedAt),
      csvTime(s.closedAt),
      s.tabCount,
      csvEuro(s.totalCents),
      csvEuro(s.discountCents),
      csvEuro(s.houseCents ?? 0),
      csvEuro(s.paidCents),
      ...categories.map((c) => csvEuro(s.byCategory.find((x) => x.category === c)?.cents ?? 0)),
      s.rewards.map((r) => `${r.count}× ${r.name}`).join(', '),
      s.note,
    ]);
  }
  return csv(rows);
}

export function tabsCsv(tabs: ClosedTab[]): string {
  const rows: (string | number)[][] = [
    ['Datum', 'Geöffnet', 'Bezahlt', 'Name', 'Kunde', 'Summe', 'Rabatt', 'Aufs Haus', 'Bezahlt €', 'Punkte +', 'Punkte −', 'Grund'],
  ];
  for (const t of tabs) {
    rows.push([
      csvDate(t.closedAt),
      csvTime(t.openedAt),
      csvTime(t.closedAt),
      t.label,
      t.customerId ? 'ja' : 'nein',
      csvEuro(t.totalCents),
      csvEuro(t.discountCents),
      csvEuro(t.houseCents ?? 0),
      csvEuro(t.paidCents),
      t.pointsEarned,
      t.pointsSpent,
      t.houseReason ?? '',
    ]);
  }
  return csv(rows);
}
