// API publique : liste des food trucks "vivants" (avec emplacement ouvert actuel).
// Lecture seule, pas d'auth. Renvoie uniquement les infos publiques (pas d'email, pas de token).
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

const sb = async (path: string, init: any = {}) => {
  const url = `${URL_}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '<no body>');
    console.error(`[supabase] ${r.status} ${r.statusText} on ${url} :: ${body.slice(0, 500)}`);
    throw new Error('db');
  }
  return r.json();
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) {
    console.error(`[trucks-live] config missing: URL=${!!URL_} KEY=${!!KEY}`);
    return res.status(503).json({ error: 'not_configured' });
  }
  if (req.method !== 'GET') return res.status(405).end();

  try {
    // Tous les trucks de la BDD + leur dernier emplacement si status=open
    // Inclut les champs riches (menu, horaires, planning, prix, emplacements connus) pour la fiche publique
    const trucks = await sb('trucks?order=updated_at.desc&select=id,name,cuisine,description,photo_url,phone,instagram,facebook,website,menu,price_range,opening_hours,schedule,known_locations,default_lat,default_lng,default_address,today_lat,today_lng,today_address,today_source,today_detected_at,today_confidence,today_raw_note,today_is_live,updated_at');
    const nowIso = new Date().toISOString();
    const locations = await sb(`truck_locations?status=eq.open&open_until=gt.${nowIso}&order=created_at.desc&select=truck_id,lat,lng,address,open_from,open_until,last_pinged_at`);
    const latestByTruck: Record<string, any> = {};
    for (const loc of locations) {
      if (!latestByTruck[loc.truck_id]) latestByTruck[loc.truck_id] = loc;
    }
    const data = trucks.map((t: any) => ({
      ...t,
      live_location: latestByTruck[t.id] || null,
    }));
    return res.status(200).json(data);
  } catch (e: any) {
    console.error(`[trucks-live] handler crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
