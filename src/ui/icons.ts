// Line icons for the drink categories (24x24, one stroke width), drawn for this app.
// Used as {@html} inside an <svg viewBox="0 0 24 24"> wrapper; see Icon.svelte.

export const icons = {
  fass: '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/><path d="M5 8a2.5 2.5 0 0 1 2.6-3 3 3 0 0 1 4.8 0A2.5 2.5 0 0 1 15 8"/>',
  flasche: '<path d="M10 2h4v4l1.5 3v11a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V9L10 6z"/><path d="M8.5 13h7"/>',
  weizen: '<path d="M8 3h8l-1 7c1.5 2 1.5 4 0 6l-.5 5h-5l-.5-5c-1.5-2-1.5-4 0-6z"/>',
  alkfrei: '<path d="M6 8h12l-1.5 13h-9z"/><path d="M13.5 8l2-5h3"/>',
  saft: '<path d="M12 7.5c-2-2-7-1.5-7 3.8 0 4.2 3 8.7 5 8.7 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-4.5 5-8.7 0-5.3-5-5.8-7-3.8z"/><path d="M12 7.5c0-2 1-3.5 3-4.5"/>',
  energy: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M13 7l-3 5h4l-3 5"/>',
  shot: '<path d="M7 6h10l-1.5 14h-7z"/><path d="M7.6 11h8.8"/>',
  whisky: '<path d="M5 7h14l-1.5 13h-11z"/><rect x="9" y="11" width="4.5" height="4.5" rx="1" transform="rotate(-12 11 13)"/>',
  cocktail: '<path d="M4 4h16l-8 9z"/><path d="M12 13v8M8 21h8"/>',
  wein: '<path d="M8 3h8v4a4 4 0 0 1-8 0z"/><path d="M12 11v10M8 21h8"/>',
  kiste: '<path d="M4 11h16v9H4z"/><path d="M7 11V6l1-2h1l1 2v5M14 11V6l1-2h1l1 2v5"/>',
  snack: '<path d="M3 11h18a9 7 0 0 1-18 0z"/><path d="M7.5 11c0-2 1-3.2 2.3-3.2M12.5 11c0-3 1.5-4.2 3-4.2"/>',
  glas: '<path d="M7 4h10l-1.5 16h-7z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
} as const;

const byCategory: Record<string, string> = {
  'Bier vom Fass': icons.fass,
  Flaschenbier: icons.flasche,
  Weißbier: icons.weizen,
  Alkoholfrei: icons.alkfrei,
  'Apfelwein & Säfte': icons.saft,
  'Energy Drinks': icons.energy,
  Spirituosen: icons.shot,
  Whisky: icons.whisky,
  Cocktails: icons.cocktail,
  'Wein & Sekt': icons.wein,
  Flaschenverkauf: icons.kiste,
  Snacks: icons.snack,
};

/** Icon of a menu category; categories the owner adds later get a neutral glass. */
export function categoryIcon(category: string): string {
  return byCategory[category] ?? icons.glas;
}

/** Two-letter badge for a tab or customer: first letters of two words, else the first two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return letters.toUpperCase();
}
