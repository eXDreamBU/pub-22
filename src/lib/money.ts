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

const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export function formatEuro(cents: number): string {
  return euro.format(cents / 100);
}
