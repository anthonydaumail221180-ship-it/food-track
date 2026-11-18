// Fil d'actu : lecture publique, publication réservée à l'administrateur (code ADMIN_TOKEN).
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
  if (!ADMIN || t.length !== ADMIN.length) return false;
  let d = 0;
  for (let i = 0; i < t.length; i++) d |= t.charCodeAt(i) ^ ADMIN.charCodeAt(i);
  return d === 0;
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  try {
    if (req.method === 'GET') return res.status(200).json(await sb('posts?order=ts.desc&limit=50&select=id,kind,title,body,ts'));
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const title = String((req.body || {}).title || '').trim().slice(0, 120);
      const body = String((req.body || {}).body || '').trim().slice(0, 1000);
      if (!title) return res.status(400).json({ error: 'title' });
      await sb('posts', { method: 'POST', body: JSON.stringify({ kind: 'news', title, body }) });
      return res.status(201).json({ ok: true });
    }
    return res.status(405).end();
  } catch {
    return res.status(500).json({ error: 'server' });
  }
}
