import { describe, expect, it } from 'vitest';
import { categoryIcon, icons, initials } from './icons';

describe('categoryIcon', () => {
  it('maps the categories of the drink card to their own icon', () => {
    expect(categoryIcon('Bier vom Fass')).toBe(icons.fass);
    expect(categoryIcon('Wein & Sekt')).toBe(icons.wein);
    expect(categoryIcon('Snacks')).toBe(icons.snack);
  });

  it('gives a category created later a neutral glass', () => {
    expect(categoryIcon('Hausspezial')).toBe(icons.glas);
  });
});

describe('initials', () => {
  it('takes the first letters of two words, or two letters of one', () => {
    expect(initials('Murat K.')).toBe('MK');
    expect(initials('Mustafa')).toBe('MU');
    expect(initials('Tisch 3')).toBe('T3');
    expect(initials('  ')).toBe('?');
  });
});
