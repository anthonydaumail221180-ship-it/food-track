import { FoodTruck } from '../types';
import { TRUCKS, SOURCES, Spot } from '../data/trucks';
import { geocodeAddressAgent } from './geocode';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let cache: Record<string, { lat: number; lng: number }> = {};
try { cache = JSON.parse(localStorage.getItem('ft_geo') || '{}'); } catch { /* ignore */ }

// Adresse -> coordonnées (OpenStreetMap), mémorisées sur l'appareil ; repli sur le quartier
const coords = async (s: Spot) => {
  if (cache[s.query]) return cache[s.query];
  await sleep(1100); // politesse envers le service gratuit
  const c = await geocodeAddressAgent(s.query);
  if (c) { cache[s.query] = c; try { localStorage.setItem('ft_geo', JSON.stringify(cache)); } catch { /* ignore */ } }
  return c || s.fallback;
};

export const fetchFoodTrucksAgent = async (): Promise<{ trucks: FoodTruck[]; sources: string[] }> => {
  const now = new Date();
  const today = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const trucks: FoodTruck[] = [];
  for (const t of TRUCKS) {
    let offset = -1;
    for (let i = 0; i < 7; i++) { if (t.schedule[(today + i) % 7]) { offset = i; break; } }
    if (offset < 0) continue;
    const day = (today + offset) % 7;
    const spot = t.schedule[day];
    const from = spot.from ?? '11:30';
    const to = spot.to ?? '14:00';
    const isToday = offset === 0;
    trucks.push({
      id: t.id, name: t.name, cuisine: t.cuisine, description: t.description, phone: t.phone,
      locationName: spot.place,
      coordinates: await coords(spot),
      rating: 0,
      hours: `${isToday ? '' : DAYS[day] + ' · '}${spot.from ? `${from} - ${to}` : 'Midi (horaires à confirmer)'}`,
      isOpen: isToday && mins >= toMin(from) && mins <= toMin(to),
    });
  }
  return { trucks, sources: SOURCES };
};
