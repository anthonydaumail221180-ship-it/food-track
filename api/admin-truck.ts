// API admin : créer un food truck + son compte propriétaire avec un secret_token.
// L'admin partage l'URL /#/truck/{secret_token} au food truck pour qu'il prenne la main.
// Protégé par ADMIN_TOKEN (comparaison en temps constant).
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN = process.env.ADMIN_TOKEN;

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

const isAdmin = (req: any) => {
  const t = String(req.headers['x-admin-token'] || '');
  if (!ADMIN) return false;
  const len = Math.max(t.length, ADMIN.length);
  let d = t.length ^ ADMIN.length;
  for (let i = 0; i < len; i++) {
    d |= (t.charCodeAt(i) || 0) ^ (ADMIN.charCodeAt(i) || 0);
  }
  return d === 0;
};

// Génère un token URL-safe d'~32 caractères (~192 bits d'entropie)
const genToken = (): string => {
  const bytes = new Uint8Array(24);
  // @ts-ignore globalThis.crypto est dispo dans le runtime Vercel
  (globalThis.crypto || require('crypto').webcrypto).getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) return res.status(503).json({ error: 'not_configured' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });

  try {
    if (req.method === 'POST') {
      // Création d'un truck + owner
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 80);
      const cuisine = String(b.cuisine || '').trim().slice(0, 60);
      const email = b.email ? String(b.email).trim().slice(0, 120) : null;
      if (name.length < 2) return res.status(400).json({ error: 'name_too_short' });

      const [truck] = await sb('trucks', {
        method: 'POST',
        body: JSON.stringify({ name, cuisine }),
      });

      const token = genToken();
      const [owner] = await sb('truck_owners', {
        method: 'POST',
        body: JSON.stringify({ truck_id: truck.id, email, secret_token: token }),
      });

      return res.status(201).json({
        truck,
        owner: { id: owner.id, email: owner.email },
        portal_url: `/#/truck/${token}`,
      });
    }

    if (req.method === 'GET') {
      const q = req.query || {};
      // Mode "stats" : renvoie le dashboard admin complet
      if (q.stats === '1') {
        const nowIso = new Date().toISOString();
        const [trucks, owners, users, sessions, reports, posts, locationsOpen] = await Promise.all([
          sb('trucks?select=id,name,cuisine,default_lat,default_lng,created_at'),
          sb('truck_owners?select=id,truck_id,email,last_login_at,created_at'),
          sb('app_users?select=id,email,first_name,nickname,is_admin,created_at,last_login_at&order=created_at.desc'),
          sb(`user_sessions?expires_at=gt.${nowIso}&select=user_id`),
          sb('reports?select=id,status'),
          sb('posts?select=id,kind'),
          sb(`truck_locations?status=eq.open&open_until=gt.${nowIso}&select=truck_id,last_pinged_at`),
        ]);
        const activeUserIds = new Set(sessions.map((s: any) => s.user_id));
        return res.status(200).json({
          stats: {
            trucks_total: trucks.length,
            trucks_geocoded: trucks.filter((t: any) => t.default_lat !== null).length,
            trucks_live: locationsOpen.length,
            owners_total: owners.length,
            owners_connected_ever: owners.filter((o: any) => o.last_login_at).length,
            users_total: users.length,
            users_admin: users.filter((u: any) => u.is_admin).length,
            users_active_now: activeUserIds.size,
            reports_pending: reports.filter((r: any) => r.status === 'pending').length,
            reports_approved: reports.filter((r: any) => r.status === 'approved').length,
            posts_total: posts.length,
          },
          users: users.map((u: any) => ({
            id: u.id, email: u.email, first_name: u.first_name, nickname: u.nickname,
            is_admin: u.is_admin, created_at: u.created_at, last_login_at: u.last_login_at,
            active_now: activeUserIds.has(u.id),
          })),
        });
      }

      // Mode "role" : promote / demote un user admin
      if (q.action === 'promote' || q.action === 'demote') {
        const uid = String(q.user_id || '');
        if (!uid) return res.status(400).json({ error: 'user_id required' });
        const [updated] = await sb(`app_users?id=eq.${uid}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_admin: q.action === 'promote' }),
        });
        return res.status(200).json({ user: updated });
      }

      // Liste tous les trucks + leurs owners (sans révéler le token aux lecteurs anonymes)
      const trucks = await sb('trucks?order=created_at.desc&select=*');
      const owners = await sb('truck_owners?select=id,truck_id,email,secret_token,last_login_at,created_at');
      const data = trucks.map((t: any) => ({
        ...t,
        owners: owners.filter((o: any) => o.truck_id === t.id).map((o: any) => ({
          ...o,
          portal_url: `/#/truck/${o.secret_token}`,
        })),
      }));
      return res.status(200).json(data);
    }

    return res.status(405).end();
  } catch (e: any) {
    console.error(`[admin-truck] handler crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
