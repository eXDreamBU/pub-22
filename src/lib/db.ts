// The whole app state as one JSON-able object, plus the pure operations on it.
// UI code mutates it only through these functions; storage.ts persists it.

import { seedMenu, type MenuItem } from './menu';
import { pointsFor, tabTotal } from './money';

export interface Product extends MenuItem {
  id: string;
  hidden?: boolean;
}

export interface Customer {
  id: string; // random, printed in the card's QR code; nothing personal
  name: string;
  phone: string;
  points: number;
  createdAt: string;
}

export interface TabLine {
  productId: string;
  category: string; // snapshot: renaming a category later does not move old numbers
  name: string;
  size?: string;
  priceCents: number; // snapshot: a later price change does not touch open tabs
  qty: number;
}

export interface Reward {
  id: string;
  name: string;
  points: number;
}

export interface Tab {
  id: string;
  customerId?: string; // missing = guest without card, no points
  label: string;
  openedAt: string;
  lines: TabLine[];
  rewards: Reward[]; // redeemed on this tab, points deducted at settle
  discountSteps: number; // each step trades settings.discountPoints for settings.discountCents
}

export interface Summary {
  totalCents: number;
  discountCents: number;
  paidCents: number;
  pointsSpent: number;
  pointsEarned: number;
}

export interface ClosedTab extends Tab, Summary {
  closedAt: string;
  shiftId?: string; // missing = belongs to the running shift
}

/** A closed shift: the numbers are frozen at close, they are what goes into the paper Kassenbericht. */
export interface Shift {
  id: string;
  startedAt: string; // earliest openedAt of its tabs
  closedAt: string;
  tabCount: number;
  totalCents: number; // value of the drinks (sum of the categories)
  discountCents: number; // points discount, not spread over the categories
  paidCents: number; // totalCents - discountCents = cash actually taken
  byCategory: { category: string; cents: number; qty: number }[];
  rewards: { name: string; count: number }[]; // free drinks handed out, no money involved
  note: string;
}

export interface Settings {
  pointsPerEuro: number;
  discountPoints: number;
  discountCents: number;
}

export interface Db {
  version: 2;
  products: Product[];
  customers: Customer[];
  tabs: Tab[];
  history: ClosedTab[];
  shifts: Shift[];
  rewards: Reward[];
  settings: Settings;
  createdAt: string;
  lastBackupAt?: string;
}

export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
}

export function createDb(now: string): Db {
  return {
    version: 2,
    products: seedMenu.map((item) => ({ ...item, id: newId() })),
    customers: [],
    tabs: [],
    history: [],
    shifts: [],
    rewards: [{ id: newId(), name: 'Freigetränk (bis 3,30 €)', points: 100 }],
    settings: { pointsPerEuro: 1, discountPoints: 100, discountCents: 500 },
    createdAt: now,
  };
}

const CARD_PREFIX = 'PUB22:';

export function cardPayload(customerId: string): string {
  return CARD_PREFIX + customerId;
}

/** Customer id from a scanned QR text, or null for codes that are not our cards. */
export function parseCardPayload(text: string): string | null {
  return text.startsWith(CARD_PREFIX) ? text.slice(CARD_PREFIX.length) : null;
}

export function addCustomer(db: Db, name: string, phone: string, now: string): Customer {
  const customer = { id: newId(), name: name.trim(), phone: phone.trim(), points: 0, createdAt: now };
  db.customers.push(customer);
  return customer;
}

function customerOf(db: Db, tab: Tab): Customer | undefined {
  return tab.customerId ? db.customers.find((c) => c.id === tab.customerId) : undefined;
}

/** Open tab for this customer; a second scan returns the tab already open. */
export function checkIn(db: Db, customerId: string, now: string): Tab {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error('Unbekannte Karte');
  const open = db.tabs.find((t) => t.customerId === customerId);
  if (open) return open;
  const tab: Tab = { id: newId(), customerId, label: customer.name, openedAt: now, lines: [], rewards: [], discountSteps: 0 };
  db.tabs.push(tab);
  return tab;
}

export function openGuestTab(db: Db, label: string, now: string): Tab {
  const tab: Tab = { id: newId(), label: label.trim() || 'Gast', openedAt: now, lines: [], rewards: [], discountSteps: 0 };
  db.tabs.push(tab);
  return tab;
}

export function addItem(tab: Tab, product: Product): void {
  const line = tab.lines.find((l) => l.productId === product.id && l.priceCents === product.priceCents);
  if (line) line.qty++;
  else tab.lines.push({ productId: product.id, category: product.category, name: product.name, size: product.size, priceCents: product.priceCents, qty: 1 });
}

export function removeItem(tab: Tab, lineIndex: number): void {
  const line = tab.lines[lineIndex];
  if (!line) return;
  if (line.qty > 1) line.qty--;
  else tab.lines.splice(lineIndex, 1);
}

function pendingPoints(db: Db, tab: Tab, discountSteps = tab.discountSteps): number {
  return tab.rewards.reduce((sum, r) => sum + r.points, 0) + discountSteps * db.settings.discountPoints;
}

/** Points the customer can still redeem on this tab. */
export function availablePoints(db: Db, tab: Tab): number {
  const customer = customerOf(db, tab);
  return customer ? customer.points - pendingPoints(db, tab) : 0;
}

export function redeemReward(db: Db, tab: Tab, reward: Reward): void {
  if (!tab.customerId) throw new Error('Gäste ohne Karte sammeln keine Punkte');
  if (availablePoints(db, tab) < reward.points) throw new Error('Nicht genug Punkte');
  tab.rewards.push({ ...reward });
}

export function setDiscountSteps(db: Db, tab: Tab, steps: number): void {
  const customer = customerOf(db, tab);
  if (!customer) throw new Error('Gäste ohne Karte sammeln keine Punkte');
  if (steps < 0 || pendingPoints(db, tab, steps) > customer.points) throw new Error('Nicht genug Punkte');
  if (steps > tab.discountSteps && tab.discountSteps * db.settings.discountCents >= tabTotal(tab.lines)) {
    throw new Error('Der Rabatt deckt schon die ganze Summe');
  }
  tab.discountSteps = steps;
}

export function tabSummary(db: Db, tab: Tab): Summary {
  const totalCents = tabTotal(tab.lines);
  const discountCents = Math.min(tab.discountSteps * db.settings.discountCents, totalCents);
  const paidCents = totalCents - discountCents;
  const isCustomer = !!customerOf(db, tab);
  return {
    totalCents,
    discountCents,
    paidCents,
    pointsSpent: isCustomer ? pendingPoints(db, tab) : 0,
    pointsEarned: isCustomer ? pointsFor(paidCents, db.settings.pointsPerEuro) : 0,
  };
}

/** Close the tab: book points, move it to the history. Payment itself goes into the bar's open cash box. */
export function settle(db: Db, tabId: string, now: string): ClosedTab {
  const index = db.tabs.findIndex((t) => t.id === tabId);
  if (index < 0) throw new Error('Deckel nicht gefunden');
  const tab = db.tabs[index];
  const closed: ClosedTab = { ...tab, ...tabSummary(db, tab), closedAt: now };
  const customer = customerOf(db, tab);
  // Clamped: rewards were already handed out even if the balance was corrected below them meanwhile.
  if (customer) customer.points = Math.max(0, customer.points + closed.pointsEarned - closed.pointsSpent);
  db.tabs.splice(index, 1);
  db.history.push(closed);
  return closed;
}

export function cancelTab(db: Db, tabId: string): void {
  db.tabs = db.tabs.filter((t) => t.id !== tabId);
}

export function lastVisits(db: Db, customerId: string, count: number): ClosedTab[] {
  return db.history
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt))
    .slice(0, count);
}

/** Closed tabs of the running shift (not yet stamped with a shift id). */
export function runningTabs(db: Db): ClosedTab[] {
  return db.history.filter((t) => !t.shiftId);
}

/** The frozen numbers of a shift, computed from its closed tabs (ISO timestamps compare as strings). */
export function summarizeShift(tabs: ClosedTab[]): Omit<Shift, 'id' | 'note'> {
  const categories = new Map<string, { cents: number; qty: number }>();
  const rewards = new Map<string, number>();
  let totalCents = 0;
  let discountCents = 0;
  for (const tab of tabs) {
    totalCents += tab.totalCents;
    discountCents += tab.discountCents;
    for (const line of tab.lines) {
      const entry = categories.get(line.category) ?? { cents: 0, qty: 0 };
      entry.cents += line.priceCents * line.qty;
      entry.qty += line.qty;
      categories.set(line.category, entry);
    }
    for (const r of tab.rewards) rewards.set(r.name, (rewards.get(r.name) ?? 0) + 1);
  }
  return {
    startedAt: tabs.map((t) => t.openedAt).reduce((a, b) => (b < a ? b : a)),
    closedAt: tabs.map((t) => t.closedAt).reduce((a, b) => (b > a ? b : a)),
    tabCount: tabs.length,
    totalCents,
    discountCents,
    paidCents: totalCents - discountCents,
    byCategory: [...categories].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.cents - a.cents),
    rewards: [...rewards].map(([name, count]) => ({ name, count })),
  };
}

/** Close the running shift: freeze its numbers and stamp its tabs. Only possible once no tab is open. */
export function closeShift(db: Db, note: string, now: string): Shift {
  if (db.tabs.length > 0) throw new Error('Erst alle Deckel abrechnen');
  const tabs = runningTabs(db);
  if (tabs.length === 0) throw new Error('Die Schicht hat noch keinen bezahlten Deckel');
  const shift: Shift = { id: newId(), ...summarizeShift(tabs), closedAt: now, note: note.trim() };
  for (const tab of tabs) tab.shiftId = shift.id;
  db.shifts.push(shift);
  return shift;
}

/** Bring a parsed backup to the current version, or throw if it is not one of ours. */
export function migrate(data: unknown): Db {
  const db = data as Db | undefined;
  const version = (db as { version?: number } | undefined)?.version;
  const arrays = [db?.products, db?.customers, db?.tabs, db?.history, db?.rewards];
  if ((version !== 1 && version !== 2) || !arrays.every(Array.isArray) || typeof db?.settings !== 'object') {
    throw new Error('Keine Pub-22-Sicherung');
  }
  if (version === 2) {
    if (!Array.isArray(db.shifts)) throw new Error('Keine Pub-22-Sicherung');
    return db;
  }
  // v1 -> v2: lines get a category, past tabs go into one "vor 0.2" shift.
  const categoryOf = (productId: string) => db.products.find((p) => p.id === productId)?.category ?? 'Sonstiges';
  for (const tab of [...db.tabs, ...db.history]) {
    for (const line of tab.lines) line.category ??= categoryOf(line.productId);
  }
  const migrated = db as unknown as Db;
  migrated.version = 2;
  migrated.shifts = [];
  if (db.history.length > 0) {
    const shift: Shift = { id: newId(), ...summarizeShift(db.history), note: 'vor 0.2' };
    for (const tab of db.history) tab.shiftId = shift.id;
    migrated.shifts.push(shift);
  }
  return migrated;
}

export function parseBackup(json: string): Db {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Keine Pub-22-Sicherung');
  }
  return migrate(data);
}
