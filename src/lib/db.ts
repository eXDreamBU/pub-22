// The whole app state as one JSON-able object, plus the pure operations on it.
// UI code mutates it only through these functions; storage.ts persists it.

import { seedMenu, type MenuItem } from './menu';
import { formatEuro, pointsFor, tabTotal } from './money';

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
  visit?: string; // openedAt of the evening it was added; missing = the tab's current evening
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
  openedAt: string; // start of the current evening: a credited tab gets it anew when it comes back
  creditedAt?: string; // angeschrieben: open, but the customer has left without paying
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
  paidBy?: string; // label of the tab that paid for this one (paying together); missing = paid itself
  houseCents?: number; // "aufs Haus": the owner's own discount, already taken off paidCents; missing = 0 (older tabs)
  houseReason?: string;
}

/** The owner's discount at settle, on top of the points discount. */
export interface House {
  cents: number;
  reason?: string;
}

/** A closed shift: the numbers are frozen at close, they are what goes into the paper Kassenbericht. */
export interface Shift {
  id: string;
  startedAt: string; // earliest openedAt of its tabs
  closedAt: string;
  tabCount: number;
  totalCents: number; // value of the drinks (sum of the categories)
  discountCents: number; // points discount, not spread over the categories
  houseCents?: number; // "aufs Haus", not spread over the categories; missing = 0 (older shifts)
  paidCents: number; // totalCents - discountCents - houseCents = cash actually taken
  byCategory: { category: string; cents: number; qty: number }[];
  rewards: { name: string; count: number }[]; // free drinks handed out, no money involved
  creditCents?: number; // all credited tabs at close, not in the cash box; missing before 0.5
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

/** Rename a customer; their open tab follows unless it was renamed by hand. */
export function renameCustomer(db: Db, customerId: string, name: string): void {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer || !name.trim()) return;
  const tab = db.tabs.find((t) => t.customerId === customerId && t.label === customer.name);
  customer.name = name.trim();
  if (tab) tab.label = customer.name;
}

function customerOf(db: Db, tab: Tab): Customer | undefined {
  return tab.customerId ? db.customers.find((c) => c.id === tab.customerId) : undefined;
}

/** Open tab for this customer; a second scan returns the tab already open, a credited one comes back. */
export function checkIn(db: Db, customerId: string, now: string): Tab {
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) throw new Error('Unbekannte Karte');
  const open = db.tabs.find((t) => t.customerId === customerId);
  if (open) {
    resumeTab(open, now);
    return open;
  }
  const tab: Tab = { id: newId(), customerId, label: customer.name, openedAt: now, lines: [], rewards: [], discountSteps: 0 };
  db.tabs.push(tab);
  return tab;
}

export function openGuestTab(db: Db, label: string, now: string): Tab {
  const tab: Tab = { id: newId(), label: label.trim() || 'Gast', openedAt: now, lines: [], rewards: [], discountSteps: 0 };
  db.tabs.push(tab);
  return tab;
}

/** Tabs of guests in the bar right now; credited tabs are open too, but not here. */
export function inBar(db: Db): Tab[] {
  return db.tabs.filter((t) => !t.creditedAt);
}

/** What all credited tabs still owe (after their discounts). */
export function creditTotal(db: Db): number {
  return db.tabs.reduce((sum, t) => sum + (t.creditedAt ? tabSummary(db, t).paidCents : 0), 0);
}

/** The oldest evening on the tab ("angeschrieben seit"). */
export function tabSince(tab: Tab): string {
  return tab.lines.map((l) => l.visit ?? tab.openedAt).reduce((a, b) => (b < a ? b : a), tab.openedAt);
}

/** Anschreiben: the customer leaves without paying, the tab stays open until they pay. */
export function creditTab(db: Db, tabId: string, now: string): void {
  const tab = db.tabs.find((t) => t.id === tabId);
  if (!tab) throw new Error('Deckel nicht gefunden');
  if (!tab.customerId) throw new Error('Nur Kunden mit Karte können anschreiben lassen');
  if (!tab.lines.length && !tab.rewards.length) throw new Error('Nichts auf dem Deckel');
  for (const line of tab.lines) line.visit ??= tab.openedAt;
  tab.creditedAt = now;
}

/** A credited tab is back in the bar; its current evening starts now, so shifts and periods date it today. */
function resumeTab(tab: Tab, now: string): void {
  if (!tab.creditedAt) return;
  delete tab.creditedAt;
  tab.openedAt = now;
}

export function addItem(tab: Tab, product: Product): void {
  // Only lines of the current evening (no visit yet) take one more; earlier evenings stay as they were.
  const line = tab.lines.find((l) => !l.visit && l.productId === product.id && l.priceCents === product.priceCents);
  if (line) line.qty++;
  else tab.lines.push({ productId: product.id, category: product.category, name: product.name, size: product.size, priceCents: product.priceCents, qty: 1 });
}

export function removeItem(tab: Tab, lineIndex: number): void {
  const line = tab.lines[lineIndex];
  if (!line) return;
  if (line.qty > 1) line.qty--;
  else tab.lines.splice(lineIndex, 1);
}

/** One more unit of an existing line, at the line's snapshot price. */
export function incrementLine(tab: Tab, lineIndex: number): void {
  const line = tab.lines[lineIndex];
  if (line) line.qty++;
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

/** What all open tabs in the bar would pay right now (after their discounts); credited tabs count in creditTotal. */
export function openTabsTotal(db: Db): number {
  return inBar(db).reduce((sum, tab) => sum + tabSummary(db, tab).paidCents, 0);
}

/** Close the tab: book points, move it to the history. Payment itself goes into the bar's open cash box. */
export function settle(db: Db, tabId: string, now: string, house: House = { cents: 0 }): ClosedTab {
  return settleTogether(db, [tabId], tabId, now, house)[0];
}

/**
 * One guest pays several tabs: each closes with its own sums and redeemed points (booked on its own customer),
 * the points earned on the whole paid sum go to the payer's customer (none if the payer has no card).
 * `house` comes off the group's sum before the points are counted.
 */
export function settleTogether(db: Db, tabIds: string[], payerTabId: string, now: string, house: House = { cents: 0 }): ClosedTab[] {
  const tabs = tabIds.map((id) => db.tabs.find((t) => t.id === id));
  if (!tabs.every((t) => t !== undefined)) throw new Error('Deckel nicht gefunden');
  const payer = tabs.find((t) => t.id === payerTabId);
  if (!payer) throw new Error('Der Zahlende gehört nicht zu den Deckeln');
  const summaries = tabs.map((t) => tabSummary(db, t));
  const dueCents = summaries.reduce((sum, s) => sum + s.paidCents, 0);
  if (!Number.isInteger(house.cents) || house.cents < 0) throw new Error('Ungültiger Betrag');
  if (house.cents > dueCents) throw new Error(`Höchstens ${formatEuro(dueCents)} aufs Haus`);
  for (const tab of tabs) resumeTab(tab, now); // paying means the customer is here tonight
  const reason = house.reason?.trim();
  // The payer's tab takes the house discount first, then the others in order, so no tab goes below zero.
  const shares = new Map<Tab, number>();
  let left = house.cents;
  for (const tab of [payer, ...tabs.filter((t) => t !== payer)]) {
    const share = Math.min(left, summaries[tabs.indexOf(tab)].paidCents);
    shares.set(tab, share);
    left -= share;
  }
  const payerCustomer = customerOf(db, payer);
  const pointsEarned = payerCustomer ? pointsFor(dueCents - house.cents, db.settings.pointsPerEuro) : 0;
  const closed = tabs.map((tab, i): ClosedTab => {
    const isPayer = tab === payer;
    const houseCents = shares.get(tab) ?? 0;
    return {
      ...tab,
      ...summaries[i],
      paidCents: summaries[i].paidCents - houseCents,
      houseCents,
      ...(houseCents > 0 && reason && { houseReason: reason }),
      pointsEarned: isPayer ? pointsEarned : 0,
      closedAt: now,
      ...(tabs.length > 1 && !isPayer && { paidBy: payer.label }),
    };
  });
  for (const tab of closed) {
    const customer = customerOf(db, tab);
    // Clamped: rewards were already handed out even if the balance was corrected below them meanwhile.
    if (customer) customer.points = Math.max(0, customer.points + tab.pointsEarned - tab.pointsSpent);
  }
  db.tabs = db.tabs.filter((t) => !tabIds.includes(t.id));
  db.history.push(...closed);
  return closed;
}

/**
 * Pay part of a tab: `qtys[i]` of line i are closed as a separate entry without customer and points.
 * The rest, rewards and discount stay on the tab; a fully paid tab without pending rewards is closed.
 */
export function payPart(db: Db, tabId: string, qtys: number[], now: string): ClosedTab {
  const tab = db.tabs.find((t) => t.id === tabId);
  if (!tab) throw new Error('Deckel nicht gefunden');
  if (qtys.length !== tab.lines.length || !qtys.every((q, i) => Number.isInteger(q) && q >= 0 && q <= tab.lines[i].qty)) {
    throw new Error('Ungültige Menge');
  }
  const lines = tab.lines.flatMap((l, i) => (qtys[i] ? [{ ...l, qty: qtys[i] }] : []));
  if (lines.length === 0) throw new Error('Nichts ausgewählt');
  const rest = tab.lines.flatMap((l, i) => (l.qty > qtys[i] ? [{ ...l, qty: l.qty - qtys[i] }] : []));
  if (tab.discountSteps && tabTotal(rest) < tabSummary(db, tab).discountCents) throw new Error('Erst den Rabatt verringern');
  resumeTab(tab, now);
  const paidCents = tabTotal(lines);
  const part: ClosedTab = {
    id: newId(),
    label: `${tab.label} (Teil)`,
    openedAt: tab.openedAt,
    lines,
    rewards: [],
    discountSteps: 0,
    totalCents: paidCents,
    discountCents: 0,
    paidCents,
    pointsSpent: 0,
    pointsEarned: 0,
    closedAt: now,
  };
  tab.lines = rest;
  if (rest.length === 0 && tab.rewards.length === 0) cancelTab(db, tab.id);
  db.history.push(part);
  return part;
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
  let houseCents = 0;
  for (const tab of tabs) {
    totalCents += tab.totalCents;
    discountCents += tab.discountCents;
    houseCents += tab.houseCents ?? 0;
    for (const line of tab.lines) {
      const entry = categories.get(line.category) ?? { cents: 0, qty: 0 };
      entry.cents += line.priceCents * line.qty;
      entry.qty += line.qty;
      categories.set(line.category, entry);
    }
    for (const r of tab.rewards) rewards.set(r.name, (rewards.get(r.name) ?? 0) + 1);
  }
  return {
    startedAt: tabs.map((t) => t.openedAt).sort()[0],
    closedAt: tabs.map((t) => t.closedAt).sort().at(-1)!,
    tabCount: tabs.length,
    totalCents,
    discountCents,
    houseCents,
    paidCents: totalCents - discountCents - houseCents,
    byCategory: [...categories].map(([category, v]) => ({ category, ...v })).sort((a, b) => b.cents - a.cents),
    rewards: [...rewards].map(([name, count]) => ({ name, count })),
  };
}

/** Card tabs in the bar with something on them: shift close credits them. */
export function tabsToCredit(db: Db): Tab[] {
  return inBar(db).filter((t) => t.customerId && (t.lines.length || t.rewards.length));
}

/** Tabs credited in the running shift, including those its close will credit. */
export function creditedThisShift(db: Db): Tab[] {
  const lastClose = db.shifts.map((s) => s.closedAt).sort().at(-1) ?? '';
  return [...db.tabs.filter((t) => t.creditedAt && t.creditedAt > lastClose), ...tabsToCredit(db)];
}

/** Why the running shift cannot be closed yet, or null. */
export function shiftCloseBlocker(db: Db): string | null {
  const guests = inBar(db).filter((t) => !t.customerId);
  if (guests.length) return `Erst ${guests.map((t) => t.label).join(', ')} abrechnen (ohne Karte)`;
  if (runningTabs(db).length === 0 && creditedThisShift(db).length === 0) return 'Die Schicht hat noch keinen bezahlten Deckel';
  return null;
}

/**
 * Close the running shift: freeze its numbers and stamp its tabs. Card tabs still in the bar are credited
 * (empty ones closed); guests without card must pay first. Nothing paid is fine if something was credited
 * since the last close.
 */
export function closeShift(db: Db, note: string, now: string): Shift {
  const blocker = shiftCloseBlocker(db);
  if (blocker) throw new Error(blocker);
  const tabs = runningTabs(db);
  const credited = creditedThisShift(db);
  const toCredit = tabsToCredit(db);
  for (const tab of inBar(db)) {
    if (toCredit.includes(tab)) creditTab(db, tab.id, now);
    else cancelTab(db, tab.id);
  }
  const shift: Shift = {
    id: newId(),
    ...summarizeShift(tabs),
    startedAt: [...tabs, ...credited].map((t) => t.openedAt).sort()[0],
    closedAt: now,
    creditCents: creditTotal(db),
    note: note.trim(),
  };
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
