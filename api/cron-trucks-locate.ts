// Cron Vercel : détecte automatiquement l'emplacement du jour des food trucks
// en scrappant Instagram/Facebook via Gemini (Google Search grounding + URL context).
// Déclenché par vercel.json toutes les 4h, ou manuellement avec Authorization: Bearer ${CRON_SECRET}.
//
// Flow :
//   1. récupère tous les trucks avec instagram OU facebook renseigné
//   2. pour chacun, prompt Gemini avec le nom + handles IG/FB + date du jour
//   3. Gemini utilise Google Search pour trouver le post du jour et extraire l'adresse
//   4. on parse la réponse JSON { address, lat, lng, confidence, raw_note, is_live }
//   5. UPDATE trucks SET today_lat/lng/address/source/detected_at/confidence/raw_note/is_live

import { GoogleGenAI } from '@google/genai';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const sb = async (path: string, init: any = {}) => {
  const url = `${URL_}/rest/v1/${path}`;
  const r = await fetch(url, {
    ...init,
    headers: { apikey: KEY as string, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`sb ${r.status} ${await r.text().catch(() => '')}`);
  if (r.status === 204) return [];
  const text = await r.text();
  if (!text) return [];
  return JSON.parse(text);
};

const todayISODate = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

// --- Mode enrichissement : trouve les comptes IG/FB officiels des trucks via Gemini + Google Search.
// Appele une seule fois en one-shot : POST /api/cron-trucks-locate?mode=enrich-socials avec Authorization: Bearer ${CRON_SECRET}
const enrichSocials = async (ai: GoogleGenAI, truck: any): Promise<{ instagram?: string; facebook?: string } | null> => {
  const prompt = `Trouve les comptes reseaux sociaux officiels du food truck suivant au Luxembourg :

Nom : ${truck.name}
Cuisine : ${truck.cuisine || 'inconnu'}
Pays : Luxembourg

TACHE : cherche sur Google leur compte Instagram et Facebook officiels. Retourne UNIQUEMENT du JSON :
{
  "instagram": "https://www.instagram.com/handle" ou null,
  "facebook": "https://www.facebook.com/page" ou null,
  "confidence": 0-100
}

Regles :
- Si tu n'es pas sur a au moins 70%, retourne null plutot que de deviner
- URLs completes (pas juste @handle)
- Verifie que c'est bien le food truck luxembourgeois (pas un homonyme)`;

  try {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
    });
    const text = r.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    if ((parsed.confidence || 0) < 70) return null;
    const out: any = {};
    if (parsed.instagram && String(parsed.instagram).startsWith('http')) out.instagram = parsed.instagram;
    if (parsed.facebook && String(parsed.facebook).startsWith('http')) out.facebook = parsed.facebook;
    if (!out.instagram && !out.facebook) return null;
    return out;
  } catch (e: any) {
    console.error(`[enrich-socials] ${truck.name} failed:`, e?.message);
    return null;
  }
};

// --- Mode feed-radar : scrute les posts recents des influenceurs food LU et les capture dans influencer_posts.
// Pour chaque influenceur actif, Gemini + Google Search va chercher ses derniers posts (Insta/TikTok/FB),
// extrait : contenu court, truck mentionne (match avec notre table trucks), lieu, hashtags, sentiment.
// Insere en BDD (unique sur post_url) pour alimenter le Feed.
const scanInfluencer = async (ai: GoogleGenAI, influ: any, truckNames: string[]): Promise<any[]> => {
  const prompt = `Tu es un agent qui surveille un influenceur food au Luxembourg et extrait ses derniers posts.

Influenceur : ${influ.display_name} (@${influ.handle} sur ${influ.platform})
URL profil : ${influ.profile_url}
Specialite : ${influ.specialty || 'cuisine generale'}

Food trucks suivis par LetzTrack (pour matching) :
${truckNames.slice(0, 50).join(', ')}

TACHE : cherche sur Google les 1 a 3 posts les plus recents de cet influenceur (moins d'une semaine idealement). Pour chaque post trouve, extrais ces informations.

REPONDS UNIQUEMENT EN JSON (tableau), sans markdown, sans texte autour :
[
  {
    "post_url": "URL exacte du post",
    "content": "resume du contenu du post (max 280 chars, en francais)",
    "truck_mentioned": "nom exact d'un truck de la liste si mentionne, sinon null",
    "location_text": "lieu mentionne si present, sinon null",
    "hashtags": ["tag1", "tag2"] ou [],
    "sentiment": "positif" | "neutre" | "negatif",
    "published_at": "date ISO approximative ou null si inconnu",
    "thumbnail_url": "URL image si visible, sinon null"
  }
]

Regles :
- Max 3 posts (les plus recents)
- Si tu ne trouves rien de recent, renvoie []
- truck_mentioned : nom EXACT de la liste ci-dessus, pas d'approximation
- Reste factuel`;

  try {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 },
    });
    const text = r.text || '';
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e: any) {
    console.error(`[scan-influencer] ${influ.handle} failed:`, e?.message);
    return [];
  }
};

const todayFrLong = () => {
  const d = new Date();
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const detectOneTruck = async (ai: GoogleGenAI, truck: any): Promise<any> => {
  const name = truck.name;
  const ig = truck.instagram ? `Instagram: ${truck.instagram}` : '';
  const fb = truck.facebook ? `Facebook: ${truck.facebook}` : '';
  const date = todayFrLong();
  const prompt = `Tu es un agent qui determine l'emplacement du jour d'un food truck au Luxembourg.

Food truck : ${name} (cuisine : ${truck.cuisine || 'inconnu'})
${ig}
${fb}
Lieux habituels : ${truck.known_locations || '(inconnus)'}
Planning hebdo : ${truck.schedule || '(inconnu)'}

Date du jour : ${date}

TACHE : cherche sur Google les derniers posts Instagram / Facebook de ce food truck. Si un post recent (aujourd'hui ou hier) annonce leur emplacement du jour (ville, rue, place, parking, evenement), extrais l'adresse la plus precise possible au Luxembourg.

REPONDS UNIQUEMENT EN JSON (pas de markdown, pas de texte autour), avec cette forme exacte :
{
  "is_live": true | false,
  "address": "adresse complete ou lieu précis, ou null",
  "city": "ville au Luxembourg ou null",
  "confidence": 0-100,
  "source_url": "URL du post trouve ou null",
  "raw_note": "resume court de ce que tu as trouve (max 200 chars, en francais)"
}

Regles :
- is_live=true SEULEMENT si tu as trouve une annonce explicite pour aujourd'hui (${date}) ou hier soir pour aujourd'hui
- confidence <40 = pas sur, 40-70 = probable, 70+ = quasi certain
- address : sois precis (nom de la rue + ville, ou nom d'une place/parking connu)
- si rien trouve : is_live=false, address=null, confidence=0, raw_note="pas de post recent"`;

  try {
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });
    const text = r.text || '';
    // On extrait le JSON (parfois Gemini renvoie du texte autour malgré l'instruction)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('no_json_in_response');
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (e: any) {
    console.error(`[detect] ${name} : ${e?.message || e}`);
    return null;
  }
};

// Geocoding simple : utilise Nominatim (OpenStreetMap) pour l'adresse texte -> lat/lng.
// Nominatim est gratuit mais rate-limite a 1 req/s. On espace les appels dans la boucle.
const geocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Luxembourg')}&format=json&limit=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'LetzTrack/1.0' } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j) || j.length === 0) return null;
    const lat = parseFloat(j[0].lat);
    const lng = parseFloat(j[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    // Sanity : lat Luxembourg entre 49.4 et 50.2, lng entre 5.7 et 6.5
    if (lat < 49.3 || lat > 50.3 || lng < 5.5 || lng > 6.6) return null;
    return { lat, lng };
  } catch { return null; }
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export default async function handler(req: any, res: any) {
  if (!URL_ || !KEY || !GEMINI_KEY) {
    return res.status(503).json({ error: 'not_configured', missing: { url: !URL_, key: !KEY, gemini: !GEMINI_KEY } });
  }
  // Auth : soit le header vercel-cron (automatique), soit Authorization: Bearer <CRON_SECRET>
  const isCron = req.headers['x-vercel-cron'] === '1';
  const auth = String(req.headers['authorization'] || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!isCron && (!CRON_SECRET || token !== CRON_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Un seul truck a la fois via query ?truck_id=xxx (pour test manuel ou admin UI)
  const singleTruckId = String((req.query && req.query.truck_id) || '').trim();
  // Limite par batch (Vercel Hobby 60s cap -> on tourne 3x/jour, batch de ~12 trucks suffit)
  const batchLimit = Math.max(1, Math.min(50, parseInt(String((req.query && req.query.limit) || '12'), 10) || 12));
  // Concurrence Gemini (5 en parallele tient dans 60s)
  const concurrency = 5;
  // Mode d'operation : "locate" (defaut) ou "enrich-socials" (trouve IG/FB des trucks qui n'en ont pas)
  const mode = String((req.query && req.query.mode) || 'locate').trim();

  if (mode === 'feed-radar') {
    // Scrute les influenceurs food LU et insere leurs posts dans influencer_posts.
    if (!CRON_SECRET || token !== CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
    const aiF = new GoogleGenAI({ apiKey: GEMINI_KEY });
    // Priorise les plus anciens scans
    const influs = await sb(`food_influencers?active=eq.true&order=last_scanned_at.asc.nullsfirst&limit=${batchLimit}&select=id,display_name,handle,platform,profile_url,specialty`);
    const allTrucks = await sb(`trucks?select=id,name&order=name.asc`);
    const truckByName: Record<string, string> = {};
    for (const t of allTrucks) truckByName[t.name.toLowerCase()] = t.id;
    const truckNames = allTrucks.map((t: any) => t.name);
    let scanned = 0, captured = 0, matched = 0;
    const results: any[] = [];
    for (let i = 0; i < influs.length; i += concurrency) {
      const slice = influs.slice(i, i + concurrency);
      await Promise.all(slice.map(async (infl: any) => {
        const posts = await scanInfluencer(aiF, infl, truckNames);
        scanned++;
        await sb(`food_influencers?id=eq.${infl.id}`, { method: 'PATCH', body: JSON.stringify({ last_scanned_at: new Date().toISOString() }) });
        for (const p of posts) {
          if (!p || !p.post_url) continue;
          const truckId = p.truck_mentioned ? (truckByName[String(p.truck_mentioned).toLowerCase()] || null) : null;
          if (truckId) matched++;
          const row: any = {
            influencer_id: infl.id,
            platform: infl.platform,
            post_url: String(p.post_url).slice(0, 500),
            content: p.content ? String(p.content).slice(0, 400) : null,
            summary: p.content ? String(p.content).slice(0, 200) : null,
            thumbnail_url: p.thumbnail_url || null,
            truck_mentioned_id: truckId,
            truck_mentioned_name: p.truck_mentioned || null,
            location_text: p.location_text || null,
            hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 10) : null,
            sentiment: p.sentiment || null,
            published_at: p.published_at || null,
          };
          try {
            await sb('influencer_posts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
            captured++;
            results.push({ influencer: infl.display_name, truck: p.truck_mentioned, url: row.post_url });
          } catch (e: any) { /* dup ignore */ }
        }
      }));
    }
    return res.status(200).json({ ok: true, mode: 'feed-radar', scanned, captured, matched, results: results.slice(0, 30) });
  }

  if (mode === 'enrich-socials') {
    // Auth requise meme pour le cron (pas de header x-vercel-cron ici, c'est manuel)
    if (!CRON_SECRET || token !== CRON_SECRET) return res.status(401).json({ error: 'unauthorized' });
    const aiE = new GoogleGenAI({ apiKey: GEMINI_KEY });
    const all = await sb(`trucks?select=id,name,cuisine,instagram,facebook&order=name.asc`);
    const trucks = all.filter((t: any) => !t.instagram && !t.facebook).slice(0, batchLimit);
    let enriched = 0;
    const results: any[] = [];
    for (let i = 0; i < trucks.length; i += concurrency) {
      const slice = trucks.slice(i, i + concurrency);
      await Promise.all(slice.map(async (t: any) => {
        const r = await enrichSocials(aiE, t);
        if (!r) { results.push({ name: t.name, found: false }); return; }
        const update: any = {};
        if (r.instagram && !t.instagram) update.instagram = r.instagram;
        if (r.facebook && !t.facebook) update.facebook = r.facebook;
        if (Object.keys(update).length) {
          await sb(`trucks?id=eq.${t.id}`, { method: 'PATCH', body: JSON.stringify(update) });
          enriched++;
          results.push({ name: t.name, found: true, ...update });
        } else {
          results.push({ name: t.name, found: false });
        }
      }));
    }
    return res.status(200).json({ ok: true, mode: 'enrich-socials', total: trucks.length, enriched, results });
  }

  const runId = `run_${Date.now()}`;
  const startedAt = new Date().toISOString();
  console.log(`[cron-locate] ${runId} starting at ${startedAt} (single=${singleTruckId || 'no'})`);

  let runRow: any = null;
  try {
    const [r] = await sb('truck_detection_runs', {
      method: 'POST',
      body: JSON.stringify({ started_at: startedAt, triggered_by: isCron ? 'vercel-cron' : (singleTruckId ? 'admin-manual' : 'manual') }),
    });
    runRow = r;
  } catch (e: any) {
    console.error('[cron-locate] cannot create run row:', e?.message);
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

  // Trucks ciblés : soit un seul, soit les plus anciens d'abord (oldest today_detected_at first) avec IG ou FB
  let trucksQuery: string;
  if (singleTruckId) {
    trucksQuery = `trucks?id=eq.${encodeURIComponent(singleTruckId)}&select=id,name,cuisine,instagram,facebook,schedule,known_locations,default_lat,default_lng,today_detected_at`;
  } else {
    trucksQuery = `trucks?or=(instagram.not.is.null,facebook.not.is.null)&order=today_detected_at.asc.nullsfirst&limit=${batchLimit}&select=id,name,cuisine,instagram,facebook,schedule,known_locations,default_lat,default_lng,today_detected_at`;
  }

  let trucks: any[] = [];
  try {
    trucks = await sb(trucksQuery);
  } catch (e: any) {
    console.error('[cron-locate] cannot list trucks:', e?.message);
    return res.status(500).json({ error: 'cannot_list_trucks' });
  }

  console.log(`[cron-locate] ${trucks.length} trucks to process (batch=${batchLimit}, concurrency=${concurrency})`);

  let detected = 0;
  let failed = 0;
  const results: any[] = [];

  // Notifie les users qui ont favorise ce truck quand il passe LIVE (transition only).
  const notifyFavoritersOfTruckLive = async (truck: any, address: string) => {
    try {
      const favs = await sb(`user_favorites?truck_id=eq.${encodeURIComponent(truck.id)}&select=user_id`);
      if (!favs.length) return 0;
      const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
      const base = host ? (host.startsWith('http') ? host : `https://${host}`) : '';
      let pushed = 0;
      await Promise.all(favs.map(async (f: any) => {
        try {
          const r = await fetch(`${base}/api/push?action=send_to_user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CRON_SECRET || ''}` },
            body: JSON.stringify({
              user_id: f.user_id,
              title: `${truck.name} est en LIVE !`,
              body: `Emplacement du jour : ${address}`,
              url: `/?truck=${truck.id}`,
              truck_id: truck.id,
              kind: 'fav_live',
              tag: `fav_live_${truck.id}`,
            }),
          });
          if (r.ok) pushed++;
        } catch {}
      }));
      return pushed;
    } catch { return 0; }
  };

  const processTruck = async (t: any) => {
    try {
      // On garde l'ancien etat pour detecter la transition offline -> LIVE
      const wasLive = !!t.today_is_live;
      const lastDetected = t.today_detected_at ? new Date(t.today_detected_at).getTime() : 0;
      const hoursSinceLast = lastDetected ? (Date.now() - lastDetected) / 3600000 : 999;

      const d = await detectOneTruck(ai, t);
      if (!d) { failed++; return; }

      let lat: number | null = null;
      let lng: number | null = null;
      if (d.is_live && d.address) {
        const geo = await geocode(d.address);
        if (geo) { lat = geo.lat; lng = geo.lng; }
      }

      const update: any = {
        today_is_live: !!d.is_live,
        today_address: d.address || null,
        today_lat: lat,
        today_lng: lng,
        today_source: d.source_url || null,
        today_confidence: typeof d.confidence === 'number' ? Math.max(0, Math.min(100, d.confidence)) : null,
        today_raw_note: d.raw_note ? String(d.raw_note).slice(0, 400) : null,
        today_detected_at: new Date().toISOString(),
      };
      await sb(`trucks?id=eq.${t.id}`, { method: 'PATCH', body: JSON.stringify(update) });
      detected++;

      // Push aux favoriteurs : si transition wasLive=false -> isLive=true avec confiance >= 60, ou si pas de push depuis >12h
      let pushed = 0;
      if (update.today_is_live && (update.today_confidence || 0) >= 60 && (!wasLive || hoursSinceLast > 12)) {
        pushed = await notifyFavoritersOfTruckLive(t, update.today_address || 'Voir la carte');
      }
      results.push({ id: t.id, name: t.name, is_live: update.today_is_live, address: update.today_address, confidence: update.today_confidence, pushed });
    } catch (e: any) {
      failed++;
      console.error(`[cron-locate] truck ${t.name} failed:`, e?.message);
    }
  };

  // Traitement par vagues de `concurrency` trucks en parallele (Gemini ~3-5s/truck, Nominatim 1req/s global ok si <60/min)
  for (let i = 0; i < trucks.length; i += concurrency) {
    const slice = trucks.slice(i, i + concurrency);
    await Promise.all(slice.map(processTruck));
    if (i + concurrency < trucks.length) await sleep(300);
  }

  const finishedAt = new Date().toISOString();
  if (runRow) {
    try {
      await sb(`truck_detection_runs?id=eq.${runRow.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ finished_at: finishedAt, trucks_total: trucks.length, trucks_detected: detected, trucks_failed: failed }),
      });
    } catch { /* ignore */ }
  }

  console.log(`[cron-locate] done: ${detected} detected, ${failed} failed, ${trucks.length} total`);

  // Si declenche par le cron Vercel (pas un trigger manuel single-truck), on enchaine
  // un mini feed-radar sur 3 influenceurs pour que le Feed reste frais sans 2eme cron.
  let feedRadar: any = null;
  if (isCron && !singleTruckId) {
    try {
      const influs = await sb(`food_influencers?active=eq.true&order=last_scanned_at.asc.nullsfirst&limit=3&select=id,display_name,handle,platform,profile_url,specialty`);
      const allTrucksMini = await sb(`trucks?select=id,name`);
      const truckByNameMini: Record<string, string> = {};
      for (const t of allTrucksMini) truckByNameMini[t.name.toLowerCase()] = t.id;
      const truckNamesMini = allTrucksMini.map((t: any) => t.name);
      let captured = 0;
      for (const infl of influs) {
        const posts = await scanInfluencer(ai, infl, truckNamesMini);
        await sb(`food_influencers?id=eq.${infl.id}`, { method: 'PATCH', body: JSON.stringify({ last_scanned_at: new Date().toISOString() }) });
        for (const p of posts) {
          if (!p || !p.post_url) continue;
          const tId = p.truck_mentioned ? (truckByNameMini[String(p.truck_mentioned).toLowerCase()] || null) : null;
          try {
            await sb('influencer_posts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({
              influencer_id: infl.id,
              platform: infl.platform,
              post_url: String(p.post_url).slice(0, 500),
              content: p.content ? String(p.content).slice(0, 400) : null,
              summary: p.content ? String(p.content).slice(0, 200) : null,
              thumbnail_url: p.thumbnail_url || null,
              truck_mentioned_id: tId,
              truck_mentioned_name: p.truck_mentioned || null,
              location_text: p.location_text || null,
              hashtags: Array.isArray(p.hashtags) ? p.hashtags.slice(0, 10) : null,
              sentiment: p.sentiment || null,
              published_at: p.published_at || null,
            })});
            captured++;
          } catch {}
        }
      }
      feedRadar = { scanned: influs.length, captured };
    } catch (e: any) { console.error('[cron-locate] feed-radar pass failed:', e?.message); }
  }

  return res.status(200).json({
    ok: true,
    run_id: runRow?.id || null,
    started_at: startedAt,
    finished_at: finishedAt,
    total: trucks.length,
    detected,
    failed,
    feed_radar: feedRadar,
    results: singleTruckId ? results : results.slice(0, 20),
  });
}
