import { describe, expect, it } from 'vitest';
import { seedMenu } from './menu';

describe('seedMenu', () => {
  it('has only positive integer cent prices', () => {
    for (const item of seedMenu) expect(Number.isInteger(item.priceCents) && item.priceCents > 0, item.name).toBe(true);
  });

  it('has no item twice in one category', () => {
    const keys = seedMenu.map((i) => `${i.category}|${i.name}|${i.size ?? ''}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps spot prices from the printed card', () => {
    const price = (name: string, size?: string) => seedMenu.find((i) => i.name === name && i.size === size)?.priceCents;
    expect(price('Coca Cola', '0,5 l')).toBe(450);
    expect(price('Berliner Luft', '2 cl')).toBe(250);
    expect(price('Jack Daniels / Gentleman Jack + 2 Softdrinks')).toBe(7000);
    expect(price('Mix-Aufpreis')).toBe(50);
  });
});
