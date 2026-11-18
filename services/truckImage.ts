import { FoodTruck } from '../types';

const PALETTES = [['#FF512F', '#DD2476'], ['#F7971E', '#FF512F'], ['#DD2476', '#6A11CB'], ['#009966', '#F7971E'], ['#0095F6', '#6A11CB']];
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Sans photo : monogramme (initiales) sur un dégradé, pas de pictogramme.
export const truckImage = (t: FoodTruck): string => {
  if (t.imageUrl) return t.imageUrl;
  const h = [...t.name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const initials = t.name.split(/[\s'’-]+/).filter(w => /[A-Za-zÀ-ÿ0-9]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'LT';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="175" cy="25" r="70" fill="#fff" fill-opacity="0.12"/><circle cx="20" cy="190" r="60" fill="#fff" fill-opacity="0.10"/><text x="100" y="124" font-family="Georgia,serif" font-style="italic" font-size="76" font-weight="700" fill="#fff" fill-opacity="0.96" text-anchor="middle">${esc(initials)}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};
