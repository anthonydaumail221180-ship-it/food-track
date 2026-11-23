// Partage social : Web Share API native + fallbacks par reseau (WhatsApp, Insta, TikTok, FB, SMS, Email).
// Sur mobile moderne (iOS/Android Chrome/Safari), navigator.share() ouvre la feuille de partage native
// qui liste directement toutes les apps installees. Sur desktop ou vieux navigateurs : on fallback.

import { FoodTruck } from '../types';

export interface ShareableContent {
  title: string;
  text: string;
  url: string;
  hashtags?: string[];
  imageUrl?: string;
}

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://letztrack.vercel.app';

export const buildTruckShare = (truck: FoodTruck): ShareableContent => {
  const truckId = truck.id.startsWith('db-') ? truck.id.slice(3) : truck.id;
  const url = `${APP_URL}/?truck=${encodeURIComponent(truckId)}`;
  const isLive = truck.isOpen || truck.aiDetected;
  const title = `${truck.name} - LetzTrack`;
  const lines: string[] = [];
  if (isLive) {
    lines.push(`${truck.name} est en LIVE aujourd'hui !`);
    if (truck.locationName) lines.push(`${truck.locationName}`);
  } else {
    lines.push(`${truck.name} - ${truck.cuisine}`);
    if (truck.locationName) lines.push(`${truck.locationName}`);
  }
  lines.push(`Decouvre sur LetzTrack :`);
  lines.push(url);
  return {
    title,
    text: lines.join('\n'),
    url,
    hashtags: ['LetzTrack', 'FoodTruck', 'Luxembourg', 'StreetFood'],
    imageUrl: truck.imageUrl,
  };
};

export const buildCheckInShare = (truckName: string, itemName: string, truckId: string): ShareableContent => {
  const url = `${APP_URL}/?truck=${encodeURIComponent(truckId)}`;
  return {
    title: `Grub chez ${truckName}`,
    text: `Je viens de deguster ${itemName} chez ${truckName}. On s'y retrouve ?\n${url}`,
    url,
    hashtags: ['LetzTrack', 'Grub', 'FoodTruck', 'Luxembourg'],
  };
};

const encode = (s: string) => encodeURIComponent(s);
const fullText = (c: ShareableContent) => c.text;
const hashtagStr = (c: ShareableContent) => (c.hashtags || []).map(h => `#${h}`).join(' ');

// --- Fallbacks par reseau (utilises quand la feuille native n'est pas dispo ou que user choisit explicitement) ---
export const shareTargets = {
  whatsapp: (c: ShareableContent) => `https://wa.me/?text=${encode(fullText(c))}`,
  telegram: (c: ShareableContent) => `https://t.me/share/url?url=${encode(c.url)}&text=${encode(c.text)}`,
  facebook: (c: ShareableContent) => `https://www.facebook.com/sharer/sharer.php?u=${encode(c.url)}&quote=${encode(c.text)}`,
  twitter: (c: ShareableContent) => `https://twitter.com/intent/tweet?url=${encode(c.url)}&text=${encode(c.text + ' ' + hashtagStr(c))}`,
  sms: (c: ShareableContent) => `sms:?body=${encode(fullText(c))}`,
  email: (c: ShareableContent) => `mailto:?subject=${encode(c.title)}&body=${encode(fullText(c))}`,
  // Instagram et TikTok n'ont pas d'URL de partage web : on copie le texte + on ouvre leur app.
  // L'utilisateur peut coller le texte dans une story / caption.
  instagram: (_c: ShareableContent) => `https://www.instagram.com/`,
  tiktok: (_c: ShareableContent) => `https://www.tiktok.com/upload`,
};

export type ShareTargetId = keyof typeof shareTargets;

export const openShareTarget = async (target: ShareTargetId, content: ShareableContent): Promise<void> => {
  const url = shareTargets[target](content);
  // Pour Instagram/TikTok, on copie le texte + l'URL pour que l'user puisse les coller
  if (target === 'instagram' || target === 'tiktok') {
    try { await navigator.clipboard.writeText(content.text); } catch { /* ignore */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const copyLink = async (content: ShareableContent): Promise<boolean> => {
  try { await navigator.clipboard.writeText(content.url); return true; } catch { return false; }
};

export const copyFullText = async (content: ShareableContent): Promise<boolean> => {
  try { await navigator.clipboard.writeText(content.text); return true; } catch { return false; }
};

// Web Share API : la feuille de partage native du navigateur (iOS/Android moderne).
// Retourne true si partage lance, false si non-supporte ou user a annule.
export const nativeShare = async (content: ShareableContent): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !(navigator as any).share) return false;
  try {
    await (navigator as any).share({ title: content.title, text: content.text, url: content.url });
    return true;
  } catch (e: any) {
    // AbortError = user a ferme la feuille, pas une erreur
    if (e?.name === 'AbortError') return true;
    return false;
  }
};

export const isNativeShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!(navigator as any).share;
};
