import { describe, expect, it } from 'vitest';
import { formatEuro, pointsFor, tabTotal } from './money';

describe('tabTotal', () => {
  it('sums quantity times price in cents', () => {
    expect(tabTotal([{ priceCents: 380, qty: 2 }, { priceCents: 420, qty: 1 }])).toBe(1180);
  });

  it('is zero for an empty tab', () => {
    expect(tabTotal([])).toBe(0);
  });
});

describe('pointsFor', () => {
  it('gives one point per full euro at rate 1', () => {
    expect(pointsFor(1850, 1)).toBe(18);
  });

  it('scales with the configured rate and rounds down', () => {
    expect(pointsFor(1850, 10)).toBe(185);
    expect(pointsFor(199, 1)).toBe(1);
    expect(pointsFor(1850, 0.5)).toBe(9);
  });

  it('never gives points for zero or negative amounts', () => {
    expect(pointsFor(0, 1)).toBe(0);
    expect(pointsFor(-500, 1)).toBe(0);
  });
});

describe('formatEuro', () => {
  it('formats cents in German style', () => {
    expect(formatEuro(1850).replace(/\s/g, ' ')).toBe('18,50 €');
  });
});
