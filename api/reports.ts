// Signalements de food trucks.
// - Tout le monde peut en déposer (statut « pending » : invisible pour les autres).
// - Seul l'administrateur (code ADMIN_TOKEN) peut les lire en détail, les valider ou les refuser.
// - Le public ne voit que les signalements validés (sans le numéro de téléphone).
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN = process.env.ADMIN_TOKEN;

const sb = async (path: string, init: any = {}) => {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error('db');
  return r.json();
};

const isAdmin = (req: any) => {
  const t = String(req.headers['x-admin-token'] || '');
  if (!ADMIN) return false;
  // Comparaison en temps constant qui ne fuit PAS la longueur du secret
  const len = Math.max(t.length, ADMIN.length);
  let d = t.length ^ ADMIN.length;
  for (let i = 0; i < len; i++) {
    d |= (t.charCodeAt(i) || 0) ^ (ADMIN.charCodeAt(i) || 0);
  }
  return d === 0;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_COLS = 'id,name,lat,lng,address,stars,photo,ts';

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      if (q.scope === 'pending') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
        return res.status(200).json(await sb('reports?status=eq.pending&order=ts.asc&select=*'));
      }
      if (q.ids) { // le statut de MES signalements (aucune autre donnée)
        const ids = String(q.ids).split(',').filter(i => UUID.test(i)).slice(0, 20);
        if (!ids.length) return res.status(200).json([]);
        return res.status(200).json(await sb(`reports?id=in.(${ids.join(',')})&select=id,status`));
      }
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      return res.status(200).json(await sb(`reports?status=eq.approved&ts=gte.${since}&order=ts.desc&select=${PUBLIC_COLS}`));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 60);
      const phone = String(b.phone || '').trim().slice(0, 25);
      const address = String(b.address || '').trim().slice(0, 200);
      const lat = Number(b.lat), lng = Number(b.lng);
      const stars = Math.max(0, Math.min(5, Math.round(Number(b.stars) || 0)));
      const photo = typeof b.photo === 'string' && b.photo.startsWith('data:image/') && b.photo.length < 200000 ? b.photo : null;
      if (name.length < 2) return res.status(400).json({ error: 'name' });
      if (phone.replace(/\D/g, '').length < 8 || !/^\+?[\d\s().-]+$/.test(phone)) return res.status(400).json({ error: 'phone' });
      if (!(lat > 49.4 && lat < 50.2 && lng > 5.7 && lng < 6.55)) return res.status(400).json({ error: 'outside_luxembourg' });
      if (!address) return res.status(400).json({ error: 'address' });
      const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
      const recent = await sb(`reports?phone=eq.${encodeURIComponent(phone)}&ts=gte.${hourAgo}&select=id`);
      if (recent.length >= 3) return res.status(429).json({ error: 'too_many' });
      const [row] = await sb('reports', { method: 'POST', body: JSON.stringify({ name, phone, lat, lng, address, stars, photo, status: 'pending' }) });
      return res.status(201).json({ id: row.id, ts: row.ts });
    }

    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const id = String((req.query || {}).id || '');
      const status = (req.body || {}).status;
      if (!UUID.test(id) || !['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'bad_request' });
      const [row] = await sb(`reports?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status, validated_at: new Date().toISOString() }) });
      if (row && status === 'approved') {
        await sb('posts', { method: 'POST', body: JSON.stringify({ kind: 'truck', title: `Nouveau food truck : ${row.name}`, body: `Repéré à ${row.address}.` }) });
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).end();
  } catch {
    return res.status(500).json({ error: 'server' });
  }
}
