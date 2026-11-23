// Push notifications API.
// Actions:
//   GET  /api/push?action=config                        -> { publicKey }
//   POST /api/push?action=subscribe  (x-session-token)  -> { endpoint, p256dh, auth, userAgent }
//   POST /api/push?action=unsubscribe (x-session-token) -> { endpoint }
//   POST /api/push?action=test        (x-session-token) -> envoie un push de test a l'utilisateur
//   POST /api/push?action=send_to_user (CRON_SECRET)    -> { user_id, title, body, url, truck_id }   (usage interne cron)

// web-push est publie a la fois en ESM (src/) et CJS (dist/), mais la detection auto Vercel
// alterne selon la version du runtime. On evite le piege en faisant un lazy dynamic import()
// au premier usage, ca marche dans les deux cas.
let _webpush: any = null;
const getWebPush = async (): Promise<any> => {
  if (_webpush) return _webpush;
  const mod: any = await import('web-push');
  _webpush = mod?.default || mod;
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    try { _webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch (e: any) { console.error('[push] vapid init:', e?.message); }
  }
  return _webpush;
};

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@letztrack.lu';
const CRON_SECRET = process.env.CRON_SECRET;

const sb = async (path: string, init: any = {}) => {
  const url = `${URL_}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`sb ${r.status} ${await r.text().catch(() => '')}`);
  if (r.status === 204) return [];
  const t = await r.text();
  if (!t) return [];
  return JSON.parse(t);
};

const authUser = async (req: any): Promise<any | null> => {
  const token = String(req.headers['x-session-token'] || '').trim();
  if (!token || token.length < 32 || token.length > 128) return null;
  try {
    const nowIso = new Date().toISOString();
    const rows = await sb(`user_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${nowIso}&select=user_id`);
    if (!rows.length) return null;
    const users = await sb(`app_users?id=eq.${rows[0].user_id}&select=id,first_name`);
    return users[0] || null;
  } catch { return null; }
};

const sendToSub = async (sub: any, payload: any): Promise<{ ok: boolean; error?: string; gone?: boolean }> => {
  try {
    const wp = await getWebPush();
    await wp.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload));
    return { ok: true };
  } catch (e: any) {
    const status = e?.statusCode;
    if (status === 404 || status === 410) {
      try { await sb(`push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'PATCH', body: JSON.stringify({ disabled: true }) }); } catch {}
      return { ok: false, error: `gone_${status}`, gone: true };
    }
    return { ok: false, error: e?.message || String(e) };
  }
};

export default async function handler(req: any, res: any) {
  const action = String((req.query && req.query.action) || '').trim();

  if (action === 'config') {
    return res.status(200).json({ publicKey: VAPID_PUBLIC || null });
  }

  if (!URL_ || !KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const b = (req.body && (typeof req.body === 'string' ? JSON.parse(req.body) : req.body)) || {};

  if (action === 'subscribe') {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    if (!b.endpoint || !b.p256dh || !b.auth) return res.status(400).json({ error: 'missing_fields' });
    try {
      await sb('push_subscriptions', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: user.id,
          endpoint: String(b.endpoint).slice(0, 1000),
          p256dh: String(b.p256dh).slice(0, 200),
          auth: String(b.auth).slice(0, 100),
          user_agent: b.userAgent ? String(b.userAgent).slice(0, 200) : null,
          disabled: false,
          last_seen_at: new Date().toISOString(),
        }),
      });
    } catch (e: any) {
      try {
        await sb(`push_subscriptions?endpoint=eq.${encodeURIComponent(b.endpoint)}`, {
          method: 'PATCH',
          body: JSON.stringify({ user_id: user.id, disabled: false, last_seen_at: new Date().toISOString() }),
        });
      } catch { return res.status(500).json({ error: 'sub_failed' }); }
    }
    return res.status(200).json({ ok: true });
  }

  if (action === 'unsubscribe') {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    if (!b.endpoint) return res.status(400).json({ error: 'missing_endpoint' });
    try { await sb(`push_subscriptions?endpoint=eq.${encodeURIComponent(b.endpoint)}`, { method: 'DELETE' }); } catch {}
    return res.status(200).json({ ok: true });
  }

  if (action === 'test') {
    const user = await authUser(req);
    if (!user) return res.status(401).json({ error: 'not_authenticated' });
    const subs = await sb(`push_subscriptions?user_id=eq.${user.id}&disabled=eq.false&select=endpoint,p256dh,auth`);
    if (!subs.length) return res.status(404).json({ error: 'no_subscription' });
    const payload = { title: `LetzTrack - test`, body: `Salut ${user.first_name || 'ami'} ! Les notifs marchent.`, url: '/', tag: 'test' };
    let sent = 0;
    for (const s of subs) {
      const r = await sendToSub(s, payload);
      if (r.ok) sent++;
    }
    try { await sb('push_log', { method: 'POST', body: JSON.stringify({ user_id: user.id, kind: 'test', payload: JSON.stringify(payload), success: sent > 0 }) }); } catch {}
    return res.status(200).json({ ok: true, sent, total: subs.length });
  }

  if (action === 'send_to_user') {
    const auth = String(req.headers['authorization'] || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!CRON_SECRET || token !== CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
    const userId = String(b.user_id || '').trim();
    if (!userId) return res.status(400).json({ error: 'missing_user_id' });
    const subs = await sb(`push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&disabled=eq.false&select=endpoint,p256dh,auth`);
    const payload = {
      title: String(b.title || 'LetzTrack').slice(0, 80),
      body: String(b.body || '').slice(0, 200),
      url: String(b.url || '/').slice(0, 200),
      truckId: b.truck_id || null,
      tag: b.tag || 'letztrack',
    };
    let sent = 0;
    for (const s of subs) {
      const r = await sendToSub(s, payload);
      if (r.ok) sent++;
    }
    try { await sb('push_log', { method: 'POST', body: JSON.stringify({ user_id: userId, truck_id: b.truck_id || null, kind: b.kind || 'broadcast', payload: JSON.stringify(payload), success: sent > 0 }) }); } catch {}
    return res.status(200).json({ ok: true, sent, total: subs.length });
  }

  return res.status(400).json({ error: 'unknown_action' });
}
