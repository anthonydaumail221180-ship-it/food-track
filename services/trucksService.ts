import { FoodTruck } from '../types';
import { TRUCKS } from '../data/trucks';

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export const fetchFoodTrucksAgent = async (): Promise<{ trucks: FoodTruck[]; sources: string[] }> => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const trucks: FoodTruck[] = TRUCKS.map(({ days, from, to, ...t }) => ({
    ...t,
    hours: `${from} - ${to}`,
    isOpen: days.includes(now.getDay()) && mins >= toMin(from) && mins <= toMin(to),
  }));
  return { trucks, sources: [] };
};
