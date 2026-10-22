// All amounts are integer cents so sums never pick up float rounding errors.

export interface Line {
  priceCents: number;
  qty: number;
}

export function tabTotal(lines: Line[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

/** Points earned for a paid amount; partial points are rounded down. */
export function pointsFor(amountCents: number, pointsPerEuro: number): number {
  if (amountCents <= 0) return 0;
  return Math.floor((amountCents * pointsPerEuro) / 100);
}

/** Cents from a typed euro amount like "3,30", "3.3" or "3 €"; null if it is not a valid amount. */
export function parseEuro(text: string): number | null {
  const match = text.replace('€', '').trim().replace(',', '.').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatEuro(cents: number): string {
  return euro.format(cents / 100);
}
