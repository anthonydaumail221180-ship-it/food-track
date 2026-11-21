// Mémorisation de la dernière destination demandée, pour proposer un "Reprendre vers X ?"
// dès l'ouverture de l'app.
export interface LastDestination {
  truckId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  ts: number; // timestamp ms
  provider?: 'apple' | 'google' | 'mobiliteit';
}

const KEY = 'foodtrack_last_dest';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000; // 7 jours

export const saveLastDest = (d: Omit<LastDestination, 'ts'>) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...d, ts: Date.now() }));
  } catch { /* ignore */ }
};

export const getLastDest = (): LastDestination | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.truckId !== 'string' || typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;
    if (Date.now() - p.ts > MAX_AGE_MS) return null;
    return p as LastDestination;
  } catch { return null; }
};

export const clearLastDest = () => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};
