// Ouvre l'appli de navigation externe choisie vers une destination (lat, lng, adresse).
// Les apps utilisent la position actuelle de l'utilisateur comme point de départ.

export type NavMode = 'driving' | 'walking' | 'transit' | 'bicycling';

export interface NavTarget {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  !(/Windows|Macintosh/i.test(navigator.userAgent));

// Apple Plan / Apple Maps
// Sur iPhone/iPad, Apple intercepte le lien maps.apple.com et ouvre l'appli Plan.
// Ailleurs, ouvre la page web Apple Maps (lecture seule mais la destination est pré-remplie).
export const openApplePlan = (t: NavTarget, mode: NavMode = 'driving') => {
  const dirflg = mode === 'walking' ? 'w' : mode === 'transit' ? 'r' : 'd';
  const url = `https://maps.apple.com/?daddr=${t.lat},${t.lng}&dirflg=${dirflg}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Google Maps - universal link qui ouvre l'app Google Maps si installée, sinon le web.
export const openGoogleMaps = (t: NavTarget, mode: NavMode = 'driving') => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}&travelmode=${mode}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Transports publics Luxembourg : on utilise Google Maps en mode transit car il consomme
// les données GTFS officielles des CFL et donne un vrai itinéraire pré-rempli (ligne de bus,
// changements, horaires temps réel), là où mobiliteit.lu n'accepte pas de deep-link public.
export const openTransit = (t: NavTarget) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}&travelmode=transit`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Lien secondaire vers mobiliteit.lu : on copie l'adresse de destination dans le presse-papiers
// et on ouvre leur planner, puis l'utilisateur colle le texte dans le champ Destination.
// (Leur SPA n'expose pas d'URL publique avec paramètres de trajet.)
export const openMobiliteit = async (t: NavTarget) => {
  const dest = t.address ? `${t.name ? t.name + ' - ' : ''}${t.address}` : `${t.lat},${t.lng}`;
  try { await navigator.clipboard.writeText(dest); } catch { /* ignore */ }
  window.open('https://www.mobiliteit.lu/fr/trajet/', '_blank', 'noopener,noreferrer');
};

// Métadonnées des options principales (Apple, Google, Transit).
export interface NavProvider {
  id: 'apple' | 'google' | 'transit' | 'mobiliteit';
  label: string;
  sublabel: string;
  action: (t: NavTarget) => void;
  recommended?: boolean;
}

export const getNavProviders = (): NavProvider[] => {
  const ios = isIOS();
  return [
    {
      id: 'apple',
      label: 'Plan',
      sublabel: ios ? 'Appli Plan d\'Apple' : 'Apple Maps (web)',
      action: openApplePlan,
      recommended: ios,
    },
    {
      id: 'google',
      label: 'Google Maps',
      sublabel: 'Voiture, vélo, à pied',
      action: openGoogleMaps,
      recommended: !ios,
    },
    {
      id: 'transit',
      label: 'Bus & Train',
      sublabel: 'Trajet CFL en temps réel (Google Maps transit)',
      action: openTransit,
    },
  ];
};
