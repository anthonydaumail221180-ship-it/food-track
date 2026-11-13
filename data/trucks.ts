// Vrais food trucks (sources : Paperjam « Food trucks : le meilleur de la rue » et Luxtoday).
// Photo : déposez le fichier dans public/trucks/ puis ajoutez image: '/trucks/nom.jpg' au camion.
// Jours : 0=dimanche, 1=lundi ... 6=samedi. Sans from/to : créneau « midi » par défaut, à confirmer.
export type Spot = { place: string; query: string; fallback: { lat: number; lng: number }; from?: string; to?: string };
export type TruckData = { id: string; name: string; cuisine: string; description: string; phone?: string; image?: string; schedule: Record<number, Spot> };

const KIRCHBERG = { lat: 49.6250, lng: 6.1600 };
const GARE = { lat: 49.6000, lng: 6.1333 };
const HAMM = { lat: 49.6050, lng: 6.1780 };
const GASPERICH = { lat: 49.5800, lng: 6.1200 };

const steichen: Spot = { place: 'Rue Edward Steichen / rue Charles Bernhoeft, Kirchberg', query: 'Rue Edward Steichen, Kirchberg, Luxembourg', fallback: KIRCHBERG };
const europe: Spot = { place: "Place de l'Europe, Kirchberg", query: "Place de l'Europe, Kirchberg, Luxembourg", fallback: KIRCHBERG };

export const SOURCES = [
  'https://paperjam.lu/article/food-trucks-le-meilleur-de-la-rue',
  'https://luxtoday.lu/fr/knowledge/food-trucks-au-luxembourg-pizzas-burgers-gastronomie-nationale',
];

export const TRUCKS: TruckData[] = [
  { id: 'tabor', name: 'Tabor Food Concept', cuisine: 'Éthiopien',
    description: 'Cuisine éthiopienne : injera doro wot (poulet épicé sur galette de teff) et sélection végétarienne.',
    schedule: {
      1: europe, 3: europe,
      2: { place: 'Giratoire boulevard Konrad Adenauer, Kirchberg', query: 'Boulevard Konrad Adenauer, Kirchberg, Luxembourg', fallback: KIRCHBERG },
      4: steichen,
      5: { place: '12 rue Erasme, Kirchberg', query: '12 Rue Erasme, Kirchberg, Luxembourg', fallback: KIRCHBERG },
    } },
  { id: 'maracas', name: 'Las Maracas', cuisine: 'Mexicain',
    description: 'Tacos, quesadillas et cochinita pibil, par deux cuisinières mexicaines.',
    schedule: {
      1: { place: 'Rue du Fort Neipperg, gare', query: 'Rue du Fort Neipperg, Luxembourg', fallback: GARE },
      2: { place: 'Giratoire rue Erasme / rue Léon Hengen, Kirchberg', query: 'Rue Léon Hengen, Kirchberg, Luxembourg', fallback: KIRCHBERG },
      3: steichen,
      5: { place: '19 rue Bitbourg, Hamm', query: '19 Rue Bitbourg, Hamm, Luxembourg', fallback: HAMM },
    } },
  { id: 'gingerhead', name: 'Gingerhead Burger', cuisine: 'Burgers', phone: '+352 20 33 19 45',
    description: 'Burgers aux sauces maison.',
    schedule: {
      2: { place: '4 rue Robert Stumper, Gasperich (Rothschild)', query: '4 Rue Robert Stumper, Gasperich, Luxembourg', fallback: GASPERICH, from: '11:45', to: '13:30' },
      5: { place: '4 rue Robert Stumper, Gasperich (Scheier et fils)', query: '4 Rue Robert Stumper, Gasperich, Luxembourg', fallback: GASPERICH, from: '11:45', to: '13:30' },
    } },
];
