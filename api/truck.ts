// API portail food truck : lecture / édition de SA fiche + emplacement du jour.
// Auth par capability URL : le food truck accède via un lien secret /#/truck/{token}
// Le token est passé en query string ou header x-truck-token sur toutes les requêtes.
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

// Récupère le truck_id depuis le token secret, ou null si invalide.
const authenticate = async (req: any): Promise<string | null> => {
  const q = req.query || {};
  const raw = String(q.token || req.headers['x-truck-token'] || '').trim();
  if (!TOKEN_RE.test(raw)) return null;
  try {
    const rows = await sb(`truck_owners?secret_token=eq.${encodeURIComponent(raw)}&select=truck_id`);
    if (!rows.length) return null;
    // Marque le dernier login (fire and forget)
    sb(`truck_owners?secret_token=eq.${encodeURIComponent(raw)}`, {
      method: 'PATCH',
      body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    }).catch(() => { /* ignore */ });
    return rows[0].truck_id as string;
  } catch {
    return null;
  }
};

const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) {
    console.error(`[truck] config missing: URL=${!!URL_} KEY=${!!KEY}`);
    return res.status(503).json({ error: 'not_configured' });
  }

  const truckId = await authenticate(req);
  if (!truckId) return res.status(401).json({ error: 'invalid_token' });

  try {
    if (req.method === 'GET') {
      // Renvoie la fiche + dernier emplacement (le "live" si status=open & open_until > now)
      const [truck] = await sb(`trucks?id=eq.${truckId}&select=*`);
      const locs = await sb(`truck_locations?truck_id=eq.${truckId}&order=created_at.desc&limit=5`);
      return res.status(200).json({ truck, recent_locations: locs });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      const patch: Record<string, any> = {};
      if (b.name !== undefined) patch.name = str(b.name, 80);
      if (b.cuisine !== undefined) patch.cuisine = str(b.cuisine, 60);
      if (b.description !== undefined) patch.description = str(b.description, 500);
      if (b.phone !== undefined) patch.phone = str(b.phone, 25);
      if (b.instagram !== undefined) patch.instagram = str(b.instagram, 80);
      if (b.facebook !== undefined) patch.facebook = str(b.facebook, 120);
      if (b.website !== undefined) patch.website = str(b.website, 200);
      if (b.photo_url !== undefined) {
        const p = String(b.photo_url || '');
        patch.photo_url = (p.startsWith('data:image/') && p.length < 300000) || p.startsWith('https://') ? p : null;
      }
      if (patch.name !== undefined && patch.name.length < 2) {
        return res.status(400).json({ error: 'name_too_short' });
      }
      if (!Object.keys(patch).length) return res.status(400).json({ error: 'empty' });
      const [updated] = await sb(`trucks?id=eq.${truckId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      return res.status(200).json({ truck: updated });
    }

    return res.status(405).end();
  } catch (e: any) {
    console.error(`[truck] handler crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
