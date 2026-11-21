// Heartbeat live tracking : met à jour last_pinged_at (et optionnellement lat/lng) sur
// l'emplacement ouvert du food truck. Appelé toutes les X minutes par TruckPortal tant
// que le truck est en service, ou à la demande ("Je bouge ici").
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

const TOKEN_RE = /^[A-Za-z0-9_-]{24,64}$/;
const authenticate = async (req: any): Promise<string | null> => {
  const raw = String((req.query || {}).token || req.headers['x-truck-token'] || '').trim();
  if (!TOKEN_RE.test(raw)) return null;
  try {
    const rows = await sb(`truck_owners?secret_token=eq.${encodeURIComponent(raw)}&select=truck_id`);
    return rows.length ? rows[0].truck_id as string : null;
  } catch { return null; }
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (req.method !== 'POST') return res.status(405).end();

  const truckId = await authenticate(req);
  if (!truckId) return res.status(401).json({ error: 'invalid_token' });

  try {
    const b = req.body || {};
    const now = new Date();
    const patch: Record<string, any> = { last_pinged_at: now.toISOString() };

    const lat = b.lat !== undefined ? Number(b.lat) : null;
    const lng = b.lng !== undefined ? Number(b.lng) : null;
    if (lat !== null && lng !== null) {
      // Zone élargie Lux + frontières
      if (!(lat > 48.5 && lat < 51.5 && lng > 4.5 && lng < 8.0)) return res.status(400).json({ error: 'outside_zone' });
      patch.lat = lat;
      patch.lng = lng;
    }

    // Met à jour la session LIVE la plus récente (status=open ET open_until futur)
    const nowIso = now.toISOString();
    const [updated] = await sb(
      `truck_locations?truck_id=eq.${truckId}&status=eq.open&open_until=gt.${encodeURIComponent(nowIso)}&order=created_at.desc&limit=1`,
      { method: 'PATCH', body: JSON.stringify(patch) }
    );
    if (!updated) return res.status(404).json({ error: 'no_active_location' });
    return res.status(200).json({ location: updated });
  } catch (e: any) {
    console.error(`[truck-heartbeat] crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
