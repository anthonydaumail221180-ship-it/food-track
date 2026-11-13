import { FoodTruck } from '../types';

const EMOJI: Record<string, string> = { 'Éthiopien': '🍲', 'Mexicain': '🌮', 'Burgers': '🍔' };
const PALETTES = [['#FF512F', '#DD2476'], ['#F7971E', '#FF512F'], ['#DD2476', '#6A11CB'], ['#009966', '#F7971E']];

export const truckImage = (t: FoodTruck): string => {
  if (t.imageUrl) return t.imageUrl;
  const h = [...t.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><text x="100" y="125" font-size="90" text-anchor="middle">${EMOJI[t.cuisine] || '🚚'}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};
