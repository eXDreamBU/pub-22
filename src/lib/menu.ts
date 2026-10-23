// Starting drink menu, entered from the bar's printed card of 11.04.2026.
// The owner maintains it in the settings afterwards; this only seeds a fresh install.

export interface MenuItem {
  category: string;
  name: string;
  size?: string;
  priceCents: number;
}

type Row = [name: string, size: string | undefined, priceCents: number];

// "Alle Schnäpse als Mix 0,50 € mehr": booked as its own tile after the spirit,
// or as one "<Schnaps> Mix" tile from the Mischgetränke category (addMixDrinks).
const MIX: Row = ['Mix-Aufpreis', undefined, 50];

const card: Record<string, Row[]> = {
  Alkoholfrei: [
    ['Coca Cola', '0,3 l', 330],
    ['Coca Cola', '0,5 l', 450],
    ['Cola light', '0,33 l', 330],
    ['Cola Zero', '0,33 l', 330],
    ['Mezzo Mix', '0,33 l', 330],
    ['Sprite', '0,33 l', 330],
    ['Fanta', '0,33 l', 330],
    ['Ginger Ale', '0,2 l', 330],
    ['Bitter Lemon', '0,2 l', 330],
    ['Wildberry', '0,2 l', 330],
    ['Wasser', '0,3 l', 280],
    ['Wasser', '1,0 l', 600],
  ],
  'Bier vom Fass': [
    ['Mönchshof/Veltins', '0,3 l', 330],
    ['Mönchshof/Veltins', '0,5 l', 500],
  ],
  Flaschenbier: [
    ['Sternla', '0,5 l', 500],
    ['Früh Kölsch', '0,33 l', 330],
    ['Veltins', '0,33 l', 330],
    ['Veltins Pülleken', '0,33 l', 330],
    ['Veltins alkoholfrei', '0,33 l', 330],
    ['Veltins V+', '0,33 l', 330],
    ['Mönchshof Kellerbier', '0,5 l', 500],
    ['Mönchshof Landbier', '0,5 l', 500],
    ['Corona', '0,33 l', 450],
    ['Desperados', '0,33 l', 450],
  ],
  Weißbier: [
    ['Kapuziner Weizen', '0,5 l', 500],
    ['Kapuziner Kristall', '0,5 l', 500],
    ['Kapuziner Weizen alkoholfrei', '0,5 l', 500],
    ['Maisel´s Weizen', '0,5 l', 500],
    ['Maisel´s Weizen alkoholfrei', '0,5 l', 500],
  ],
  'Apfelwein & Säfte': [
    ['Possmann Apfelwein', '0,33 l', 350],
    ['Orangensaft', '0,3 l', 350],
    ['Apfelsaft', '0,3 l', 350],
  ],
  'Energy Drinks': [
    ['Red Bull', '0,25 l', 350],
    ['Effect Energy', '1,0 l', 700],
  ],
  Spirituosen: [
    MIX,
    ['Berliner Luft', '2 cl', 250],
    ['Fürst Bismark', '2 cl', 250],
    ['Ouzo', '2 cl', 250],
    ['Raki', '2 cl', 250],
    ['Klopfer', '2 cl', 250],
    ['Jägermeister', '2 cl', 300],
    ['Ramazotti', '2 cl', 300],
    ['Tequila Silver/Gold', '2 cl', 300],
    ['Baileys', '2 cl', 300],
    ['Mariacron', '2 cl', 300],
    ['Goldkrone', '2 cl', 300],
    ['Ficken Likör', '2 cl', 300],
    ['Scharfes Luder', '2 cl', 300],
    ['Scharfer Papa Fuego', '2 cl', 300],
    ['Fireball Likör', '2 cl', 300],
    ['Date Drink', '2 cl', 300],
    ['Asbach', '2 cl', 350],
    ['Bacardi', '2 cl', 350],
    ['Havana Club', '2 cl', 350],
    ['Captain Morgan', '2 cl', 350],
    ['Southern Comfort', '2 cl', 350],
    ['Wodka', '2 cl', 350],
    ['Gin', '2 cl', 350],
    ['Pernot', '2 cl', 350],
    ['Mr. Jekyll Absinth', '2 cl', 350],
    ['Absinth 66', '2 cl', 350],
    ['Montelobos Mezcal', '2 cl', 350],
    ['Zündkerzen Likör', '2 cl', 400],
    ['Kleiner Spritzer Likör', '2 cl', 400],
    ['Waldecker Kirsch', '2 cl', 400],
    ['Hamlet Absinth', '2 cl', 400],
    ['Gletscher Eis', '2 cl', 400],
    ['Bergfeuer Likör', '2 cl', 400],
    ['Absinth 70%', '2 cl', 400],
    ['Prinz Alte Marille', '2 cl', 400],
  ],
  Whisky: [
    MIX,
    ['Jim Beam', '2 cl', 350],
    ['Jack Daniels', '2 cl', 400],
    ['Gentleman Jack', '2 cl', 500],
    ['Johnny Walker', '2 cl', 500],
    ['Chivas Regal', '2 cl', 500],
  ],
  Cocktails: [
    ['Lillet mit Wildberry & Beeren', '0,3 l', 700],
    ['Aperol Spritz', '0,3 l', 700],
    ['Sex on the Beach', '0,2 l', 700],
    ['Pina Colada', '0,2 l', 700],
    ['Tequila Sunrise', '0,2 l', 700],
    ['Mojito', '0,2 l', 700],
    ['Mai Tai', '0,2 l', 700],
    ['Zombie', '0,2 l', 700],
    ['Caipirinha', '0,2 l', 700],
    ['Swimming Pool', '0,2 l', 700],
    ['Red Berry (alkoholfrei)', '0,2 l', 500],
    ['Virgin Colada (alkoholfrei)', '0,2 l', 500],
    ['Tropical Mystery (alkoholfrei)', '0,2 l', 500],
    ['Big Apple (alkoholfrei)', '0,2 l', 500],
  ],
  'Wein & Sekt': [
    ['Rotwein Rioja (trocken)', '0,2 l', 500],
    ['Rotwein Rioja (trocken)', '0,5 l', 1000],
    ['Rotwein Chianti (trocken)', '0,2 l', 500],
    ['Rotwein Chianti (trocken)', '0,5 l', 1000],
    ['Weißwein Sauvignon (trocken)', '0,2 l', 500],
    ['Weißwein Sauvignon (trocken)', '0,5 l', 1000],
    ['Rosé Rioja (Cepa Lebrel)', '0,2 l', 500],
    ['Rosé Rioja (Cepa Lebrel)', '0,5 l', 1000],
    ['Rotkäppchen (trocken)', '0,2 l', 500],
    ['Rotkäppchen (halbtrocken)', '0,2 l', 500],
    ['Rotkäppchen (Rosé)', '0,2 l', 500],
    ['Scavy', '0,2 l', 500],
  ],
  Flaschenverkauf: [
    ['Goldkrone / Mariacron + 2 Softdrinks', undefined, 5000],
    ['Jim Beam / Asbach / Bacardi + 2 Softdrinks', undefined, 6000],
    ['Havana / Captain Morgan + 2 Softdrinks', undefined, 6000],
    ['Jack Daniels / Gentleman Jack + 2 Softdrinks', undefined, 7000],
  ],
  Snacks: [
    ['Twix / Snickers / Mars', undefined, 150],
    ['Salzstangen im Korb', undefined, 100],
    ['Salzstangen (ganze Tüte)', undefined, 300],
    ['Chips im Korb', undefined, 150],
    ['Baguette (Käse / Salami)', undefined, 300],
    ['Pizza', undefined, 700],
  ],
};

const MIXABLE = ['Spirituosen', 'Whisky'];

/**
 * Every visible spirit and whisky once more as "<name> Mix" in the category Mischgetränke, priced at the spirit plus
 * its own category's Mix-Aufpreis, inserted so that Mischgetränke is the category right after Whisky (or Spirituosen
 * without Whisky) in first-appearance order. `toItem` turns a new mix into the caller's type.
 */
export function addMixDrinks<T extends MenuItem & { hidden?: boolean }>(items: T[], toItem: (mix: MenuItem) => T): T[] {
  const surcharge = (category: string) => items.find((i) => i.category === category && i.name === MIX[0])?.priceCents ?? MIX[2];
  const mixes = items
    .filter((i) => MIXABLE.includes(i.category) && i.name !== MIX[0] && !i.hidden)
    .map((i) => toItem({ category: 'Mischgetränke', name: `${i.name} Mix`, priceCents: i.priceCents + surcharge(i.category) }));
  const whisky = items.findIndex((i) => i.category === 'Whisky');
  const from = whisky >= 0 ? whisky : items.findIndex((i) => i.category === 'Spirituosen');
  const seen = new Set(items.slice(0, from + 1).map((i) => i.category));
  const next = items.findIndex((i, n) => n > from && !seen.has(i.category));
  const at = next >= 0 ? next : items.length;
  return [...items.slice(0, at), ...mixes, ...items.slice(at)];
}

export const seedMenu: MenuItem[] = addMixDrinks(
  Object.entries(card).flatMap(([category, rows]) =>
    rows.map(([name, size, priceCents]) => (size ? { category, name, size, priceCents } : { category, name, priceCents })),
  ),
  (mix) => mix,
);
