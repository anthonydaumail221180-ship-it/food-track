// Fil d'actu : lecture publique, publication réservée à l'administrateur (code ADMIN_TOKEN).
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
  // Comparaison en temps constant qui ne fuit PAS la longueur du secret
  const len = Math.max(t.length, ADMIN.length);
  let d = t.length ^ ADMIN.length;
  for (let i = 0; i < len; i++) {
    d |= (t.charCodeAt(i) || 0) ^ (ADMIN.charCodeAt(i) || 0);
  }
  return d === 0;
};

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY) {
    console.error(`[feed] config missing: URL=${!!URL_} KEY=${!!KEY}`);
    return res.status(503).json({ error: 'not_configured' });
  }
  try {
    if (req.method === 'GET') {
      const includeInflu = String((req.query && req.query.include_influencers) || '1') === '1';
      const posts = await sb('posts?order=ts.desc&limit=30&select=id,kind,title,body,ts');
      if (!includeInflu) return res.status(200).json(posts);
      // Enrichit avec les posts recents d'influenceurs captures par le feed-radar
      let influPosts: any[] = [];
      try {
        influPosts = await sb('influencer_posts?order=published_at.desc.nullslast&limit=30&select=id,platform,post_url,content,summary,thumbnail_url,truck_mentioned_name,truck_mentioned_id,location_text,hashtags,sentiment,published_at,captured_at,influencer:food_influencers(display_name,handle,profile_url,verified)');
      } catch (e: any) { console.warn('[feed] influencer_posts fetch failed:', e?.message); }
      const influMapped = influPosts.map((p: any) => ({
        id: `infl-${p.id}`,
        kind: 'influencer',
        title: p.influencer?.display_name ? `${p.influencer.display_name} (@${p.influencer.handle})` : 'Influenceur food LU',
        body: p.content || p.summary || '',
        ts: p.published_at || p.captured_at,
        platform: p.platform,
        postUrl: p.post_url,
        thumbnailUrl: p.thumbnail_url,
        truckName: p.truck_mentioned_name,
        truckId: p.truck_mentioned_id,
        locationText: p.location_text,
        hashtags: p.hashtags,
        sentiment: p.sentiment,
        verified: p.influencer?.verified || false,
        handle: p.influencer?.handle,
      }));
      // Merge trie par ts desc
      const all = [...posts.map((p: any) => ({ ...p, kind: p.kind || 'news' })), ...influMapped];
      all.sort((a: any, b: any) => new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime());
      return res.status(200).json(all.slice(0, 50));
    }
    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'unauthorized' });
      const title = String((req.body || {}).title || '').trim().slice(0, 120);
      const body = String((req.body || {}).body || '').trim().slice(0, 1000);
      if (!title) return res.status(400).json({ error: 'title' });
      await sb('posts', { method: 'POST', body: JSON.stringify({ kind: 'news', title, body }) });
      return res.status(201).json({ ok: true });
    }
    return res.status(405).end();
  } catch (e: any) {
    console.error(`[feed] handler crash: ${e?.message || e}`);
    return res.status(500).json({ error: 'server' });
  }
}
