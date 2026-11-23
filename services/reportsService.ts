import { FoodTruck } from '../types';

// Un signalement est d'abord « en attente de validation » : seul son auteur le voit (sur son appareil).
// Une fois validé par l'administrateur, il apparaît pour tout le monde.
export interface NewReport { name: string; phone: string; lat: number; lng: number; address: string; stars: number; photo?: string }
interface MyReport { id: string; name: string; lat: number; lng: number; address: string; stars: number; photo?: string; ts: number }

const KEY = 'letztrack_my_reports';
const DAY = 24 * 3600 * 1000;

const loadMine = (): MyReport[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return (raw as MyReport[]).filter(r => r && typeof r.ts === 'number' && Date.now() - r.ts < DAY);
  } catch { return []; }
};
const saveMine = (l: MyReport[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 5))); }
  catch { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 5).map(r => ({ ...r, photo: undefined })))); } catch { /* ignore */ } }
};

export type SubmitResult = { ok: true } | { ok: false; message: string };

export const submitReport = async (r: NewReport): Promise<SubmitResult> => {
  try {
    const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
    if (res.status === 429) return { ok: false, message: "Trop de signalements avec ce numéro. Réessayez dans une heure." };
    if (res.status === 400) return { ok: false, message: "Signalement refusé : vérifiez le nom, le numéro et que vous êtes bien au Luxembourg." };
    if (!res.ok) return { ok: false, message: "Le signalement est momentanément indisponible. Réessayez plus tard." };
    const d = await res.json();
    saveMine([{ id: d.id, name: r.name, lat: r.lat, lng: r.lng, address: r.address, stars: r.stars, photo: r.photo, ts: Date.now() }, ...loadMine()]);
    return { ok: true };
  } catch {
    return { ok: false, message: "Pas de connexion. Réessayez plus tard." };
  }
};

const toTruck = (r: { id: string; name: string; lat: number; lng: number; address: string; stars: number; photo?: string | null; ts: number | string }, status?: FoodTruck['status']): FoodTruck => {
  const hh = new Date(r.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return {
    id: `report-${r.id}`,
    name: r.name,
    cuisine: 'Signalé par la communauté',
    description: status === 'pending' ? "Votre signalement est en attente de validation : il n'est visible que par vous pour l'instant."
      : status === 'rejected' ? "Votre signalement n'a pas été retenu."
      : `Repéré aujourd'hui à ${hh} par un utilisateur de LëtzTrack.`,
    locationName: r.address,
    coordinates: { lat: r.lat, lng: r.lng },
    rating: r.stars || 0,
    imageUrl: r.photo || undefined,
    isOpen: true,
    hours: `Signalé à ${hh}`,
    status,
  };
};

// Camions validés (visibles par tous) + MES signalements encore en attente (visibles par moi seul)
export const fetchCommunityTrucks = async (): Promise<FoodTruck[]> => {
  let approved: FoodTruck[] = [];
  try {
    const r = await fetch('/api/reports');
    if (r.ok) approved = (await r.json()).map((x: any) => toTruck(x));
  } catch { /* hors ligne */ }

  const mine = loadMine();
  let mineTrucks: FoodTruck[] = [];
  if (mine.length) {
    let statuses: { id: string; status: string }[] = [];
    try {
      const r = await fetch('/api/reports?ids=' + mine.map(m => m.id).join(','));
      if (r.ok) statuses = await r.json();
    } catch { /* ignore */ }
    const st = (id: string) => statuses.find(s => s.id === id)?.status || 'pending';
    mineTrucks = mine.filter(m => st(m.id) !== 'approved').map(m => toTruck(m, st(m.id) === 'rejected' ? 'rejected' : 'pending'));
  }
  return [...mineTrucks, ...approved];
};

// ---- Fil d'actu ----
export interface FeedPost {
  id: string;
  kind: 'truck' | 'news' | 'influencer';
  title: string;
  body: string;
  ts: string;
  // Fields present only for kind === 'influencer'
  platform?: 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'blog';
  postUrl?: string;
  thumbnailUrl?: string | null;
  truckName?: string | null;
  truckId?: string | null;
  locationText?: string | null;
  hashtags?: string[] | null;
  sentiment?: 'positif' | 'neutre' | 'negatif' | null;
  verified?: boolean;
  handle?: string;
}

export const fetchFeed = async (): Promise<FeedPost[]> => {
  try {
    const r = await fetch('/api/feed');
    if (r.ok) return await r.json();
  } catch { /* ignore */ }
  return [];
};

// ---- Administration (code secret saisi par l'administrateur, vérifié par le serveur) ----
export interface PendingReport { id: string; name: string; phone: string; lat: number; lng: number; address: string; stars: number; photo?: string; ts: string }
const hdr = (token: string) => ({ 'Content-Type': 'application/json', 'x-admin-token': token });

export const adminFetchPending = async (token: string): Promise<PendingReport[] | 'unauthorized' | 'error'> => {
  try {
    const r = await fetch('/api/reports?scope=pending', { headers: hdr(token) });
    if (r.status === 401) return 'unauthorized';
    return r.ok ? await r.json() : 'error';
  } catch { return 'error'; }
};
export const adminDecide = async (token: string, id: string, status: 'approved' | 'rejected'): Promise<boolean> => {
  try { return (await fetch('/api/reports?id=' + id, { method: 'PATCH', headers: hdr(token), body: JSON.stringify({ status }) })).ok; } catch { return false; }
};
export const adminPostNews = async (token: string, title: string, body: string): Promise<boolean> => {
  try { return (await fetch('/api/feed', { method: 'POST', headers: hdr(token), body: JSON.stringify({ title, body }) })).ok; } catch { return false; }
};
