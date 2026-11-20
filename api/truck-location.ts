// API emplacement du jour d'un food truck.
// POST /api/truck-location?token=XXX avec { lat, lng, address, open_until } → crée une nouvelle session d'emplacement (status 'open').
// DELETE /api/truck-location?token=XXX → ferme la session actuellement ouverte.
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
  const q = req.query || {};
  const raw = String(q.token || req.headers['x-truck-token'] || '').trim();
  if (!TOKEN_RE.test(raw)) return null;
  try {
    const rows = await sb(`truck_owners?secret_token=eq.${encodeURIComponent(raw)}&select=truck_id`);
    return rows.length ? rows[0].truck_id as string : null;
  } catch {
    return null;
  }
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) {
    console.error(`[truck-location] config missing: URL=${!!URL_} KEY=${!!KEY}`);
    return res.status(503).json({ error: 'not_configured' });
  }

  const truckId = await authenticate(req);
  if (!truckId) return res.status(401).json({ error: 'invalid_token' });

  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      const address = String(b.address || '').trim().slice(0, 250);
      // open_until : ISO string, max +12h depuis maintenant ; par défaut +4h
      const now = Date.now();
      let openUntil: Date;
      if (b.open_until) {
        const parsed = new Date(b.open_until);
        if (isNaN(+parsed)) return res.status(400).json({ error: 'open_until_invalid' });
        if (+parsed < now + 5 * 60 * 1000) return res.status(400).json({ error: 'open_until_too_soon' });
        if (+parsed > now + 12 * 3600 * 1000) return res.status(400).json({ error: 'open_until_too_late' });
        openUntil = parsed;
      } else {
        openUntil = new Date(now + 4 * 3600 * 1000);
      }
      if (!(lat > 49.4 && lat < 50.2 && lng > 5.7 && lng < 6.55)) {
        return res.status(400).json({ error: 'outside_luxembourg' });
      }
      if (address.length < 2) return res.status(400).json({ error: 'address_required' });

      // Ferme toute session 'open' en cours pour ce truck (idempotence)
      await sb(`truck_locations?truck_id=eq.${truckId}&status=eq.open`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });

      // Crée la nouvelle session
      const [row] = await sb('truck_locations', {
        method: 'POST',
        body: JSON.stringify({
          truck_id: truckId,
          lat, lng, address,
          open_from: new Date().toISOString(),
          open_until: openUntil.toISOString(),
          status: 'open',
        }),
      });
      return res.status(201).json({ location: row });
    }

    if (req.method === 'DELETE') {
      await sb(`truck_locations?truck_id=eq.${truckId}&status=eq.open`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'closed' }),
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).end();
  } catch (e: any) {
    console.error(`[truck-location] handler crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
