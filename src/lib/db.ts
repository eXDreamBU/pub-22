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
}

export interface Settings {
  pointsPerEuro: number;
  discountPoints: number;
  discountCents: number;
}

export interface Db {
  version: 1;
  products: Product[];
  customers: Customer[];
  tabs: Tab[];
  history: ClosedTab[];
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
    version: 1,
    products: seedMenu.map((item) => ({ ...item, id: newId() })),
    customers: [],
    tabs: [],
    history: [],
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
  else tab.lines.push({ productId: product.id, name: product.name, size: product.size, priceCents: product.priceCents, qty: 1 });
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

/** Close the tab: book points, move it to the history. Payment itself runs through the TSE register. */
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

export function parseBackup(json: string): Db {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Keine Pub-22-Sicherung');
  }
  const db = data as Db;
  const arrays = [db?.products, db?.customers, db?.tabs, db?.history, db?.rewards];
  if (db?.version !== 1 || !arrays.every(Array.isArray) || typeof db.settings !== 'object') {
    throw new Error('Keine Pub-22-Sicherung');
  }
  return db;
}
