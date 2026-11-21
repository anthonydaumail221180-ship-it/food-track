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

// Mobiliteit.lu - planificateur de transports publics Luxembourg.
// Utilise l'adresse (fallback coordonnées) car leur planner raisonne mieux en texte.
export const openMobiliteit = (t: NavTarget) => {
  // Le planner accepte des coords ; on inclut l'adresse pour aider le matching.
  const to = t.address ? `${t.address}` : `${t.lat},${t.lng}`;
  const url = `https://www.mobiliteit.lu/fr/routing/?to=${encodeURIComponent(to)}&toLat=${t.lat}&toLon=${t.lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
};

// Métadonnées des 3 options, pour alimenter le modal de choix.
export interface NavProvider {
  id: 'apple' | 'google' | 'mobiliteit';
  label: string;
  sublabel: string;
  action: (t: NavTarget) => void;
  // Indique si on recommande cette option sur la plateforme actuelle
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
      id: 'mobiliteit',
      label: 'mobiliteit.lu',
      sublabel: 'Transports publics Luxembourg',
      action: openMobiliteit,
    },
  ];
};
