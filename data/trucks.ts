// Food trucks de LëtzTrack.
// Sources : tableau officiel de la Ville de Luxembourg (période du 1er oct. 2026 au 31 mars 2027, consulté le 18/11/2026),
// commune de Leudelange (mise à jour 16/07/2025), Paperjam (11/06/2026), Chronicle.lu.
// Les tableaux de la Ville sont INDICATIFS et changent à chaque période (été / hiver).
// Photo : déposez le fichier dans public/trucks/ puis ajoutez image: '/trucks/nom.jpg' au camion.
// Jours : 0=dimanche, 1=lundi ... 6=samedi. Sans from/to : créneau « midi » par défaut, à confirmer.
export type Spot = { place: string; query: string; fallback: { lat: number; lng: number }; from?: string; to?: string };
export type TruckData = { id: string; name: string; cuisine: string; description: string; phone?: string; image?: string; schedule: Record<number, Spot> };

const KIRCHBERG = { lat: 49.6250, lng: 6.1600 };
const GARE = { lat: 49.6000, lng: 6.1333 };
const HAMM = { lat: 49.6050, lng: 6.1780 };
const GASPERICH = { lat: 49.5800, lng: 6.1200 };
const LIMPERTSBERG = { lat: 49.6245, lng: 6.1190 };
const MERL = { lat: 49.6040, lng: 6.1090 };
const LEUDELANGE = { lat: 49.5686, lng: 6.0706 };

// Emplacements officiels de la Ville de Luxembourg (11h-15h, ou 11h-20h pour certains sites)
const kroll: Spot = { place: 'Rue Guillaume Kroll, Gasperich', query: 'Rue Guillaume Kroll, Gasperich, Luxembourg', fallback: GASPERICH };
const adenauer: Spot = { place: 'Giratoire boulevard Konrad Adenauer / rue Albert Borschette, Kirchberg', query: 'Boulevard Konrad Adenauer, Kirchberg, Luxembourg', fallback: KIRCHBERG };
const steichen: Spot = { place: 'Rue Edward Steichen / rue Charles Bernhoeft, Kirchberg', query: 'Rue Edward Steichen, Kirchberg, Luxembourg', fallback: KIRCHBERG };
const europe: Spot = { place: "Place de l'Europe, Kirchberg", query: "Place de l'Europe, Kirchberg, Luxembourg", fallback: KIRCHBERG };
const erasme: Spot = { place: 'Giratoire rue Erasme / rue Léon Hengen, Kirchberg', query: 'Rue Léon Hengen, Kirchberg, Luxembourg', fallback: KIRCHBERG };
const sax: Spot = { place: 'Avenue Joseph Sax, Limpertsberg', query: 'Avenue Joseph Sax, Limpertsberg, Luxembourg', fallback: LIMPERTSBERG };
const bove: Spot = { place: 'Rue Nic Bové, Merl', query: 'Rue Nic Bové, Merl, Luxembourg', fallback: MERL };

const TBC = 'Carte et horaires exacts à confirmer.';

export const SOURCES = [
  'https://www.vdl.lu/fr/travailler/exercer-une-activite-dans-lespace-public/etablir-un-food-truck',
  'https://www.leudelange.lu/wp-content/uploads/2025/06/emplacements-foodtruck-actuel.pdf',
  'https://paperjam.lu/article/food-trucks-le-meilleur-de-la-rue',
  'https://luxtoday.lu/fr/knowledge/food-trucks-au-luxembourg-pizzas-burgers-gastronomie-nationale',
];

export const TRUCKS: TruckData[] = [
  { id: 'tabor', name: 'Tabor Food Concept', cuisine: 'Éthiopien',
    description: 'Cuisine éthiopienne : injera doro wot (poulet épicé sur galette de teff) et sélection végétarienne.',
    schedule: { 1: europe, 3: europe, 4: steichen, 5: erasme } },
  { id: 'maracas', name: 'Las Maracas', cuisine: 'Mexicain',
    description: 'Tacos, quesadillas et cochinita pibil, par deux cuisinières mexicaines.',
    schedule: {
      1: { place: 'Rue du Fort Neipperg, gare', query: 'Rue du Fort Neipperg, Luxembourg', fallback: GARE },
      2: erasme,
      3: steichen,
      5: { place: '19 rue Bitbourg, Hamm', query: '19 Rue Bitbourg, Hamm, Luxembourg', fallback: HAMM },
    } },
  { id: 'gingerhead', name: 'Gingerhead Burger', cuisine: 'Burgers', phone: '+352 20 33 19 45',
    description: 'Burgers aux sauces maison.',
    schedule: {
      2: { place: '4 rue Robert Stumper, Gasperich (Rothschild)', query: '4 Rue Robert Stumper, Gasperich, Luxembourg', fallback: GASPERICH, from: '11:45', to: '13:30' },
      5: { place: '4 rue Robert Stumper, Gasperich (Scheier et fils)', query: '4 Rue Robert Stumper, Gasperich, Luxembourg', fallback: GASPERICH, from: '11:45', to: '13:30' },
    } },
  { id: 'franks', name: "Frank's Burger", cuisine: 'Burgers', description: `Food truck de burgers. ${TBC}`,
    schedule: { 2: adenauer, 4: europe, 5: kroll } },
  { id: 'jaynepal', name: 'Jay Nepal', cuisine: 'Street food', description: `Food truck présent sur plusieurs sites par semaine. ${TBC}`,
    schedule: { 1: adenauer, 2: kroll, 3: europe, 4: europe, 5: adenauer } },
  { id: 'familywu', name: 'FamilyWu Food', cuisine: 'Street food', description: `Food truck présent à Kirchberg. ${TBC}`,
    schedule: { 1: erasme, 2: europe, 5: europe } },
  { id: 'niu', name: 'Niu Noodle', cuisine: 'Nouilles', description: `Food truck de nouilles à Kirchberg. ${TBC}`,
    schedule: { 1: steichen, 2: europe } },
  { id: 'homeflavours', name: 'Home Flavours', cuisine: 'Géorgien et grec', description: `Cuisine géorgienne et grecque. ${TBC}`,
    schedule: { 2: steichen } },
  { id: 'planetdog', name: 'Planet Dog', cuisine: 'Hot-dogs', description: `Food truck de hot-dogs. ${TBC}`,
    schedule: { 5: steichen } },
  { id: 'atelier-gusto', name: 'Atelier del Gusto', cuisine: 'Street food', description: `Food truck à Kirchberg. ${TBC}`,
    schedule: { 3: erasme, 5: europe } },
  { id: 'spuntino', name: 'Lo Spuntino di Mauro & Vincenzo', cuisine: 'Italien', description: `Food truck italien à Kirchberg. ${TBC}`,
    schedule: { 1: europe } },
  { id: 'celtic', name: 'Celtic Fish & Chips', cuisine: 'Fish & chips', description: `Fish & chips à Kirchberg. ${TBC}`,
    schedule: { 4: erasme } },
  { id: 'atelier-gourmet', name: "L'Atelier du Gourmet", cuisine: 'Street food', description: `Food truck présent à Gasperich et Merl. ${TBC}`,
    schedule: { 3: kroll, 5: bove } },
  { id: 'beiruty', name: 'Beiruty', cuisine: 'Street food', description: `Food truck à Kirchberg. ${TBC}`,
    schedule: { 4: adenauer } },
  { id: 'weluxe', name: 'WELUXE', cuisine: 'Street food', description: `Food truck présent à Gasperich et Limpertsberg. ${TBC}`,
    schedule: { 1: kroll, 2: sax } },
  // Leudelange (horaires exacts publiés par la commune, mise à jour 16/07/2025 : à revérifier)
  { id: 'chefguo', name: 'Chef Guo', cuisine: 'Street food', description: 'Leudelange, zone d’activités (horaires de la commune, à revérifier).',
    schedule: { 2: { place: '15 rue Léon Laval, Leudelange', query: '15 Rue Léon Laval, Leudelange', fallback: LEUDELANGE, from: '11:00', to: '13:00' } } },
  { id: 'lilis', name: "Lili's Food", cuisine: 'Street food', description: 'Leudelange, zone d’activités (horaires de la commune, à revérifier).',
    schedule: { 4: { place: '15 rue Léon Laval, Leudelange', query: '15 Rue Léon Laval, Leudelange', fallback: LEUDELANGE, from: '11:30', to: '14:30' } } },
  { id: 'nunos', name: "NUNO'S TRUCK", cuisine: 'Street food', description: 'Leudelange, zone d’activités (horaires de la commune, à revérifier).',
    schedule: { 5: { place: '15 rue Léon Laval, Leudelange', query: '15 Rue Léon Laval, Leudelange', fallback: LEUDELANGE, from: '11:30', to: '14:00' } } },
  { id: 'pizzalux', name: 'PIZZALUX', cuisine: 'Pizza', description: 'Pizzas le mardi soir à Leudelange (horaires de la commune, à revérifier).',
    schedule: { 2: { place: 'Parking Place du Lavoir, Leudelange', query: 'Place du Lavoir, Leudelange', fallback: LEUDELANGE, from: '18:00', to: '20:30' } } },
];
