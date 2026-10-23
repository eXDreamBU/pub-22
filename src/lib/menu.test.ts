import { describe, expect, it } from 'vitest';
import { addMixDrinks, seedMenu } from './menu';

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

  it('offers every spirit and whisky as a mix for 0,50 € more, after Whisky', () => {
    const mixes = seedMenu.filter((i) => i.category === 'Mischgetränke');
    const spirits = seedMenu.filter((i) => ['Spirituosen', 'Whisky'].includes(i.category) && i.name !== 'Mix-Aufpreis');
    expect(mixes.map((i) => i.name)).toEqual(spirits.map((i) => `${i.name} Mix`));
    expect(mixes.find((i) => i.name === 'Bacardi Mix')).toEqual({ category: 'Mischgetränke', name: 'Bacardi Mix', priceCents: 400 });
    expect(seedMenu.filter((i) => i.name === 'Mix-Aufpreis').map((i) => i.category)).toEqual(['Spirituosen', 'Whisky']);
    const order = [...new Set(seedMenu.map((i) => i.category))];
    expect(order.indexOf('Mischgetränke')).toBe(order.indexOf('Whisky') + 1);
  });
});

describe('addMixDrinks', () => {
  it("uses the menu's Mix-Aufpreis and skips hidden spirits and other categories", () => {
    const items = [
      { category: 'Spirituosen', name: 'Mix-Aufpreis', priceCents: 60 },
      { category: 'Spirituosen', name: 'Wodka', size: '2 cl', priceCents: 350 },
      { category: 'Whisky', name: 'Alt', priceCents: 500, hidden: true },
      { category: 'Bier', name: 'Pils', priceCents: 400 },
    ];
    expect(addMixDrinks(items, (m) => m).map((i) => `${i.category}|${i.name}|${i.priceCents}`)).toEqual([
      'Spirituosen|Mix-Aufpreis|60',
      'Spirituosen|Wodka|350',
      'Whisky|Alt|500',
      'Mischgetränke|Wodka Mix|410',
      'Bier|Pils|400',
    ]);
  });

  it("prices each mix with its own category's Mix-Aufpreis, 0,50 € when the category has none", () => {
    const items = [
      { category: 'Spirituosen', name: 'Mix-Aufpreis', priceCents: 50 },
      { category: 'Spirituosen', name: 'Wodka', priceCents: 350 },
      { category: 'Whisky', name: 'Mix-Aufpreis', priceCents: 100 },
      { category: 'Whisky', name: 'Jim Beam', priceCents: 350 },
    ];
    const price = (name: string) => addMixDrinks(items, (m) => m).find((i) => i.name === name)?.priceCents;
    expect(price('Wodka Mix')).toBe(400);
    expect(price('Jim Beam Mix')).toBe(450);
    expect(addMixDrinks(items.slice(0, 2).concat(items[3]), (m) => m).find((i) => i.name === 'Jim Beam Mix')?.priceCents).toBe(400);
  });

  it('without Whisky puts the mixes right after Spirituosen', () => {
    const items = [
      { category: 'Bier', name: 'Pils', priceCents: 400 },
      { category: 'Spirituosen', name: 'Wodka', priceCents: 350 },
      { category: 'Cocktails', name: 'Mojito', priceCents: 700 },
      { category: 'Spirituosen', name: 'Sambuca', priceCents: 300 },
    ];
    expect(addMixDrinks(items, (m) => m).map((i) => i.name)).toEqual(['Pils', 'Wodka', 'Wodka Mix', 'Sambuca Mix', 'Mojito', 'Sambuca']);
  });
});
