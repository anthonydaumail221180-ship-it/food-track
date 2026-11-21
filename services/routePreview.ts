// Calcul de preview de trajet avant d'ouvrir l'appli externe.
// Utilise OSRM public pour un ETA voiture précis, et estime vélo/marche à partir de la distance.
// Objectif : donner au user le "trajet le plus rapide" en 1 coup d'œil, à la Waze.

export type NavMode = 'car' | 'bike' | 'walk' | 'transit';

export interface RouteEstimate {
  mode: NavMode;
  durationSec: number;
  distanceM: number;
  // true si c'est une vraie route (API), false si c'est juste une estimation à vol d'oiseau
  realistic: boolean;
}

export interface RoutePreview {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  car: RouteEstimate;
  bike: RouteEstimate;
  walk: RouteEstimate;
  transit: RouteEstimate;
  fastest: NavMode;
  straightDistanceM: number;
}

// Haversine : distance à vol d'oiseau en mètres.
const haversineM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371_000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Appelle OSRM pour la route voiture (gratuit, pas de clé)
const fetchCarRouteOSRM = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<RouteEstimate | null> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const controller = new AbortController();
    const to2 = setTimeout(() => controller.abort(), 6000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(to2);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.code !== 'Ok' || !d.routes?.[0]) return null;
    return {
      mode: 'car',
      durationSec: Math.round(d.routes[0].duration),
      distanceM: Math.round(d.routes[0].distance),
      realistic: true,
    };
  } catch {
    return null;
  }
};

export const previewRoute = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RoutePreview> => {
  const straightM = haversineM(from, to);
  const straightKm = straightM / 1000;

  // Voiture : OSRM si possible, sinon estimation 40 km/h + facteur 1.3 pour contourner les routes
  const osrmCar = await fetchCarRouteOSRM(from, to);
  const car: RouteEstimate = osrmCar || {
    mode: 'car',
    durationSec: Math.round((straightKm * 1.3 / 40) * 3600),
    distanceM: Math.round(straightM * 1.3),
    realistic: false,
  };

  // Vélo : 15 km/h moyen en ville + facteur 1.2
  const bike: RouteEstimate = {
    mode: 'bike',
    durationSec: Math.round((straightKm * 1.2 / 15) * 3600),
    distanceM: Math.round(straightM * 1.2),
    realistic: false,
  };

  // Marche : 5 km/h + facteur 1.15
  const walk: RouteEstimate = {
    mode: 'walk',
    durationSec: Math.round((straightKm * 1.15 / 5) * 3600),
    distanceM: Math.round(straightM * 1.15),
    realistic: false,
  };

  // Transports publics : approximation = voiture × 1.5 + 8 min (attente + marche jusqu'à l'arrêt)
  // Ne s'affiche que si distance > 800 m (sinon la marche gagne toujours)
  const transit: RouteEstimate = {
    mode: 'transit',
    durationSec: straightM < 800 ? walk.durationSec : Math.round(car.durationSec * 1.5 + 480),
    distanceM: Math.round(straightM * 1.4),
    realistic: false,
  };

  // Trouve le mode le plus rapide
  const candidates: RouteEstimate[] = [car, bike, walk, transit];
  candidates.sort((a, b) => a.durationSec - b.durationSec);
  const fastest = candidates[0].mode;

  return { from, to, car, bike, walk, transit, fastest, straightDistanceM: Math.round(straightM) };
};

// Formatage humain
export const formatDuration = (sec: number): string => {
  if (sec < 60) return 'moins d\'1 min';
  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const rm = totalMin % 60;
  return rm ? `${h} h ${rm}` : `${h} h`;
};

export const formatDistance = (m: number): string => {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
};
